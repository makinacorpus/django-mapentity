import logging

from django.contrib.gis.db.models.functions import Transform
from django.views.generic.list import ListView
from django_filters.rest_framework import DjangoFilterBackend
from djgeojson.views import GeoJSONLayerView
from rest_framework import viewsets, renderers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_datatables.filters import DatatablesFilterBackend
from rest_framework_datatables.renderers import DatatablesRenderer
from rest_framework_gis.filters import InBBoxFilter

from mapentity import models as mapentity_models
from .base import BaseListView
from .mixins import FilterListMixin, ModelViewMixin, JSONResponseMixin
from .. import serializers as mapentity_serializers
from ..decorators import (view_cache_response_content, view_cache_latest,
                          view_permission_required)
from ..filters import MapEntityFilterSet, MapentityInBBoxFilter
from ..pagination import MapentityDatatablePagination
from ..renderers import GeoJSONRenderer
from ..settings import API_SRID, app_settings

logger = logging.getLogger(__name__)


class MapEntityLayer(FilterListMixin, ModelViewMixin, GeoJSONLayerView):
    """
    Take a class attribute `model` with a `latest_updated` method used for caching.
    """

    force2d = True
    srid = API_SRID
    precision = app_settings.get('GEOJSON_PRECISION')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Backward compatibility with django-geojson 1.X
        # for JS ObjectsLayer and rando-trekking application
        # TODO: remove when migrated
        properties = dict([(k, k) for k in self.properties])
        if 'id' not in self.properties:
            properties['id'] = 'pk'
        self.properties = properties

    @classmethod
    def get_entity_kind(cls):
        return mapentity_models.ENTITY_LAYER

    @view_permission_required()
    @view_cache_latest()
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)

    @view_cache_response_content()
    def render_to_response(self, context, **response_kwargs):
        return super().render_to_response(context, **response_kwargs)


class MapEntityJsonList(JSONResponseMixin, BaseListView, ListView):
    """
    Return objects list as a JSON that will populate the Jquery.dataTables.
    """

    @classmethod
    def get_entity_kind(cls):
        return mapentity_models.ENTITY_JSON_LIST

    def get_context_data(self, **kwargs):
        """
        Override the most important part of JSONListView... (paginator)
        """
        serializer = mapentity_serializers.DatatablesSerializer()
        return serializer.serialize(self.get_queryset(),
                                    fields=self.columns,
                                    model=self.get_model())

    @view_permission_required()
    @view_cache_latest()
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)


class MapEntityViewSet(viewsets.ModelViewSet):
    renderer_classes = [renderers.BrowsableAPIRenderer,
                        renderers.JSONRenderer,
                        GeoJSONRenderer,
                        DatatablesRenderer, ]
    pagination_class = MapentityDatatablePagination
    filter_backends = [MapentityInBBoxFilter, DatatablesFilterBackend, DjangoFilterBackend]
    filterset_class = MapEntityFilterSet
    bbox_filter_field = 'geom'
    bbox_filter_include_overlapping = True

    def get_serializer_class(self):
        """ Use specific Serializer for GeoJSON """
        renderer, media_type = self.perform_content_negotiation(self.request)
        if getattr(renderer, 'format') == 'geojson':
            return self.geojson_serializer_class
        else:
            return self.serializer_class

    def get_queryset(self):
        """ Transform projection for geojson """
        renderer, media_type = self.perform_content_negotiation(self.request)
        qs = super().get_queryset()
        if getattr(renderer, 'format') == 'geojson':
            return qs.annotate(api_geom=Transform("geom", API_SRID)).defer("geom")
        return qs

    # @action(detail=False, url_path='(?P<page_length>\d+)/filter_infos', methods=['get'])
    @action(detail=False, methods=['get'])
    def filter_infos(self, request, page_length, *args, **kwargs):
        """ List of all object primary keys according filters """
        qs = self.get_queryset()
        qs = self.filter_queryset(qs)
        # qs = qs.annotate(row_number=Window(expression=RowNumber(),
        #                                    order_by=[F('pk')]))
        # qs = qs.annotate(page=F('row_number') / int(page_length) + 1)
        return Response({
            #'pk_list': qs.values('pk', 'page'),
            'pk_list': qs.values_list('pk', flat=True),
            'count': qs.count(),
        })
