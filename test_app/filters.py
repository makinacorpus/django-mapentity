from django_filters.rest_framework import BooleanFilter
from test_app.models import DummyModel, Road

from mapentity.filters import MapEntityFilterSet


class DummyModelFilterSet(MapEntityFilterSet):
    public = BooleanFilter(field_name='public', lookup_expr='exact')

    class Meta:
        model = DummyModel
        fields = ('public', 'name')


class RoadFilterSet(MapEntityFilterSet):
    class Meta:
        model = Road
        fields = ('id', 'name')
