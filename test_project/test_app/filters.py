from django_filters.rest_framework import BooleanFilter

from mapentity.filters import MapEntityFilterSet

from .models import City, DummyAptModel, DummyModel, Road


class DummyModelFilterSet(MapEntityFilterSet):
    public = BooleanFilter(field_name="public", lookup_expr="exact")

    class Meta:
        model = DummyModel
        fields = ("public", "name")


class RoadFilterSet(MapEntityFilterSet):
    class Meta:
        model = Road
        fields = ("id", "name")


class DummyAptFilterSet(MapEntityFilterSet):
    public = BooleanFilter(field_name="public", lookup_expr="exact")

    class Meta:
        model = DummyAptModel  # Assuming DummyaptModel is similar to DummyModel
        fields = ("public", "name")


class CityFilterSet(MapEntityFilterSet):
    class Meta:
        model = City
        fields = ("id", "name")
