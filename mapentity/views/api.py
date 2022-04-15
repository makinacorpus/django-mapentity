import logging

from django.contrib.gis.db.models.functions import Transform
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, renderers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_datatables.filters import DatatablesFilterBackend
from rest_framework_datatables.renderers import DatatablesRenderer

from .. import serializers as mapentity_serializers
from ..filters import MapEntityFilterSet
from ..pagination import MapentityDatatablePagination
from ..renderers import GeoJSONRenderer
from ..settings import API_SRID

logger = logging.getLogger(__name__)

#
# class MapEntityLayer(FilterListMixin, ModelViewMixin, generics.ListAPIView):
#     """
#     Take a class attribute `model` with a `latest_updated` method used for caching.
#     """
#     srid = API_SRID
#     precision = app_settings.get('GEOJSON_PRECISION')
#
#
#     @classmethod
#     def get_entity_kind(cls):
#         return mapentity_models.ENTITY_LAYER
#
#     @view_permission_required()
#     @view_cache_latest()
#     def dispatch(self, *args, **kwargs):
#         return super().dispatch(*args, **kwargs)
#
#     @view_cache_response_content()
#     def render_to_response(self, context, **response_kwargs):
#         return super().render_to_response(context, **response_kwargs)
#


class MapEntityViewSet(viewsets.ModelViewSet):
    renderer_classes = [renderers.JSONRenderer,
                        GeoJSONRenderer,
                        renderers.BrowsableAPIRenderer,
                        DatatablesRenderer, ]
    geojson_serializer_class = None
    pagination_class = MapentityDatatablePagination
    filter_backends = [DatatablesFilterBackend, DjangoFilterBackend]
    filterset_class = MapEntityFilterSet

    def get_serializer_class(self):
        """ Use specific Serializer for GeoJSON """
        renderer, media_type = self.perform_content_negotiation(self.request)
        if getattr(renderer, 'format') == 'geojson':
            if self.geojson_serializer_class:
                return self.geojson_serializer_class
            else:
                _model = self.serializer_class.Meta.model

                class MapentityGeometrySerializer(mapentity_serializers.MapentityGeojsonModelSerializer):
                    class Meta(mapentity_serializers.MapentityGeojsonModelSerializer.Meta):
                        model = _model
            return MapentityGeometrySerializer

        elif getattr(renderer, 'format') == 'datatables':
            # dynamic override of serializer class to match datatable content
            class DatatablesSerializer(mapentity_serializers.MapentityDatatableSerializer, self.serializer_class):
                class Meta(self.serializer_class.Meta):
                    pass
            return DatatablesSerializer
        else:
            return self.serializer_class

    def get_queryset(self):
        """ Transform projection for geojson """
        renderer, media_type = self.perform_content_negotiation(self.request)
        qs = super().get_queryset()
        if getattr(renderer, 'format') == 'geojson':
            return qs.annotate(api_geom=Transform("geom", API_SRID)).defer("geom")
        return qs

    def get_filter_count_infos(self, qs):
        """ Override this method to change count info in List dropdown menu """
        return qs.count()

    @action(detail=False, methods=['get'])
    def filter_infos(self, request, *args, **kwargs):
        """ List of all object primary keys according filters """
        qs = self.get_queryset()
        qs = self.filter_queryset(qs)

        return Response({
            'pk_list': qs.values_list('pk', flat=True),
            'count': self.get_filter_count_infos(qs),
        })
