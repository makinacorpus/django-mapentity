import logging

from django.conf import settings
from django.contrib.gis.db.models.functions import Transform
from django.template import loader
from django.utils.translation import gettext_lazy as _
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import renderers, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_datatables.filters import DatatablesFilterBackend
from rest_framework_datatables.renderers import DatatablesRenderer
from vectortiles import VectorLayer
from vectortiles.mixins import BaseTileJSONView, BaseVectorTileView
from vectortiles.rest_framework.renderers import MVTRenderer

from .. import serializers as mapentity_serializers
from ..decorators import view_cache_latest, view_cache_response_content
from ..filters import MapEntityFilterSet
from ..pagination import MapentityDatatablePagination
from ..renderers import GeoJSONRenderer
from ..settings import API_SRID

logger = logging.getLogger(__name__)


class MapEntityViewSet(BaseTileJSONView, BaseVectorTileView, viewsets.ModelViewSet):
    model = None
    renderer_classes = [
        DatatablesRenderer,
        renderers.JSONRenderer,
        GeoJSONRenderer,
        renderers.BrowsableAPIRenderer,
    ]
    geojson_serializer_class = None
    pagination_class = MapentityDatatablePagination
    filter_backends = [DatatablesFilterBackend, DjangoFilterBackend]
    filterset_class = MapEntityFilterSet

    def get_layer_classes(self):
        if self.model is None:
            return []

        class MapentityVectorLayer(VectorLayer):
            model = self.model
            id = self.model.__name__.lower()  # id for data layer in vector tile
            min_zoom = 8
            max_zoom = 22
            # queryset_limit = 1000  # if you want to limit feature number per tile

            geom_field = "geom"  # geom field to consider in qs
            tile_fields = ("name", "id")  # other fields to include from qs
            tile_extent = 4096  # define tile extent
            tile_buffer = (
                256  # buffer around tiles (intersected polygon display without borders)
            )
            clip_geom = True  # geometry clipped in tile

        return [
            MapentityVectorLayer,
        ]

    def get_view_perm(self):
        """use by view_permission_required decorator"""
        return self.model.get_permission_codename("layer")

    def get_serializer_class(self):
        """Use specific Serializer for GeoJSON"""
        renderer, media_type = self.perform_content_negotiation(self.request)
        if getattr(renderer, "format") == "geojson":
            if self.geojson_serializer_class:
                return self.geojson_serializer_class
            else:
                _model = self.serializer_class.Meta.model

                class MapentityGeometrySerializer(
                    mapentity_serializers.MapentityGeojsonModelSerializer
                ):
                    class Meta(
                        mapentity_serializers.MapentityGeojsonModelSerializer.Meta
                    ):
                        model = _model

            return MapentityGeometrySerializer

        elif getattr(renderer, "format") == "datatables":
            # dynamic override of serializer class to match datatable content
            class DatatablesSerializer(
                mapentity_serializers.MapentityDatatableSerializer,
                self.serializer_class,
            ):
                class Meta(self.serializer_class.Meta):
                    if self.serializer_class.Meta.fields != "__all__":
                        combined_fields = (
                            mapentity_serializers.MapentityDatatableSerializer.Meta.fields
                            + self.serializer_class.Meta.fields
                        )
                        # Remove duplicates while preserving order
                        fields = list(dict.fromkeys(combined_fields))
                    else:
                        fields = "__all__"

            return DatatablesSerializer
        else:
            return self.serializer_class

    @property
    def queryset(self):
        return self.model.objects.all()

    def get_queryset(self):
        """Transform projection for geojson"""
        renderer, media_type = self.perform_content_negotiation(self.request)
        qs = super().get_queryset()
        if getattr(renderer, "format") == "geojson":
            return qs.annotate(api_geom=Transform("geom", API_SRID)).defer("geom")
        return qs

    def get_filter_count_infos(self, qs):
        """Override this method to change count info in List dropdown menu"""
        return qs.count()

    @action(detail=False, methods=["get"])
    def filter_infos(self, request, *args, **kwargs):
        """List of all object primary keys according filters"""
        qs = self.get_queryset()
        qs = self.filter_queryset(qs)
        return Response(
            {
                "pk_list": qs.values_list("pk", flat=True),
                "count": self.get_filter_count_infos(qs),
            }
        )

    @view_cache_latest()
    @view_cache_response_content()
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @action(
        detail=True,
        methods=["get"],
        url_path="popup-content",
        renderer_classes=[renderers.JSONRenderer],
    )
    def popup_content(self, request, *args, **kwargs):
        obj = self.get_object()
        model_name = self.model.__name__.lower()
        label_config = getattr(settings, "POPUP_CONTENT", {})
        fields = label_config.get(model_name, []).copy()

        context = {
            "button_label": _("Detail sheet"),
            "detail_url": obj.get_detail_url(),
            "attributes": [],
            "title": str(obj),
        }

        for field_name in fields:
            try:
                value = mapentity_serializers.field_as_string(obj, field_name)
            except AttributeError:
                # ignore fields that are not available without raising an error
                value = None

            # add field name for boolean field for readability
            if value in [_("yes"), _("no")]:
                value = f"{obj._meta.get_field(field_name).verbose_name}: {value}"

            if value:
                context["attributes"].append(value)

        template = loader.get_template("mapentity/mapentity_popup_content.html")
        return Response(template.render(context))

    @action(
        detail=False,
        methods=["get"],
        renderer_classes=(MVTRenderer,),
        url_path="mvt/(?P<z>\d+)/(?P<x>\d+)/(?P<y>\d+)",
        url_name="mvt",
    )
    def mvt(self, request, *args, **kwargs):
        x, y, z = int(kwargs.get("x")), int(kwargs.get("y")), int(kwargs.get("z"))
        tile = self.get_layer_tiles(z, x, y)
        return Response(tile)

    @action(
        detail=False,
        methods=["get"],
        renderer_classes=(renderers.JSONRenderer,),
        url_path="tilejson",
        url_name="tilejson",
    )
    def tilejson(self, request, *args, **kwargs):
        # Build the tile URL template from the mvt endpoint
        mvt_url = self.reverse_action("mvt", kwargs={"z": 0, "x": 0, "y": 0})
        tile_url = mvt_url.replace("0/0/0", "{z}/{x}/{y}")
        tilejson = self.get_tilejson(tile_url)
        return Response(tilejson)
