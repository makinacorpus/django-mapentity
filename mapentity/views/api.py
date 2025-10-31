import logging

from django.conf import settings
from django.contrib.gis.db.models.functions import Transform
from django.core.exceptions import FieldDoesNotExist
from django.db import models
from django.template import loader
from django.utils.translation import gettext_lazy as _
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import renderers, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_datatables.filters import DatatablesFilterBackend
from rest_framework_datatables.renderers import DatatablesRenderer

from .. import serializers as mapentity_serializers
from ..decorators import view_cache_latest, view_cache_response_content
from ..filters import MapEntityFilterSet
from ..pagination import MapentityDatatablePagination
from ..renderers import GeoJSONRenderer
from ..settings import API_SRID

logger = logging.getLogger(__name__)


class MapEntityViewSet(viewsets.ModelViewSet):
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
                    pass

            return DatatablesSerializer
        else:
            return self.serializer_class

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
                "attributes": [],
            }
        )

    @action(detail=True, methods=["get"])
    def popup_content(self, request, *args, **kwargs):
        obj = self.get_object()
        model_name = self.model.__name__.lower()
        label_config = getattr(settings, "LABEL_PER_MODEL", {})
        fields = label_config.get(model_name, []).copy()

        def get_field_value(obj, field):
            try:
                modelfield = self.model._meta.get_field(field)
            except FieldDoesNotExist:
                modelfield = None

            value = getattr(obj, field + "_display", getattr(obj, field, None))
            if isinstance(value, bool):
                field_name = obj._meta.get_field(field).verbose_name
                value = f"{field_name}: " + (_("no"), _("yes"))[value]

            if isinstance(modelfield, models.ManyToManyField) and not isinstance(
                value, str
            ):
                value = ", ".join([str(val) for val in value.all()])

            return mapentity_serializers.smart_plain_text(value, ascii)

        def clean_value(value):
            if isinstance(value, str):
                # truncate long text (around 2 rows)
                if len(value) > 100:
                    value = value[:100] + "..."
            return value

        context = {
            "button_label": _("Detail sheet"),
            "detail_url": obj.get_detail_url(),
            "attributes": [],
            "title": str(obj),
        }

        for field_name in fields:
            value = get_field_value(obj, field_name)
            if value:
                context["attributes"].append(clean_value(value))

        template = loader.get_template("mapentity/mapentity_popup_content.html")
        return Response(template.render(context))

    @view_cache_latest()
    @view_cache_response_content()
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)
