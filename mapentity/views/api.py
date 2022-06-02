import logging

from django.contrib.gis.db.models.functions import Transform
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, renderers
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
    renderer_classes = [renderers.JSONRenderer,
                        GeoJSONRenderer,
                        renderers.BrowsableAPIRenderer,
                        DatatablesRenderer, ]
    geojson_serializer_class = None
    pagination_class = MapentityDatatablePagination
    filter_backends = [DatatablesFilterBackend, DjangoFilterBackend]
    filterset_class = MapEntityFilterSet

    def get_view_perm(self):
        """ use by view_permission_required decorator """
        return self.model.get_permission_codename('layer')

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

    @view_cache_latest()
    @view_cache_response_content()
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)
