from django_filters.rest_framework import BooleanFilter
from test_app.models import DummyModel, City, MushroomSpot, Road

from mapentity.filters import MapEntityFilterSet


class DummyModelBboxFilter(MapEntityFilterSet):

    class Meta:
        model = DummyModel
        fields = MapEntityFilterSet.Meta.fields
        filter_overrides = MapEntityFilterSet.Meta.filter_overrides


class DummyModelFilter(MapEntityFilterSet):
    public = BooleanFilter(field_name='public', lookup_expr='exact')

    class Meta:
        model = DummyModel
        fields = ('public', 'name')


class MushroomSpotBboxFilter(MapEntityFilterSet):

    class Meta:
        model = MushroomSpot
        fields = MapEntityFilterSet.Meta.fields
        filter_overrides = MapEntityFilterSet.Meta.filter_overrides


class CityBboxFilter(MapEntityFilterSet):

    class Meta:
        model = City
        fields = MapEntityFilterSet.Meta.fields
        filter_overrides = MapEntityFilterSet.Meta.filter_overrides


class RoadBboxFilter(MapEntityFilterSet):

    class Meta:
        model = Road
        fields = MapEntityFilterSet.Meta.fields
        filter_overrides = MapEntityFilterSet.Meta.filter_overrides
