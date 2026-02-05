from django_filters.rest_framework import BooleanFilter

from mapentity.filters import MapEntityFilterSet

from .models import (
    City,
    ComplexModel,
    DollModel,
    DummyModel,
    ManikinModel,
    MushroomSpot,
    Road,
    Sector,
)


class MushroomSpotFilterSet(MapEntityFilterSet):
    class Meta:
        model = MushroomSpot
        fields = ("id", "name")


class DummyModelFilterSet(MapEntityFilterSet):
    public = BooleanFilter(field_name="public", lookup_expr="exact")

    class Meta:
        model = DummyModel
        fields = ("public", "name")


class RoadFilterSet(MapEntityFilterSet):
    class Meta:
        model = Road
        fields = ("id", "name")


class DollModelFilterSet(MapEntityFilterSet):
    class Meta:
        model = DollModel
        fields = ("id",)


class ManikinModelFilterSet(MapEntityFilterSet):
    class Meta:
        model = ManikinModel
        fields = ("id", "dummy")


class CityFilterSet(MapEntityFilterSet):
    class Meta:
        model = City
        fields = ("id", "name")


class SectorFilterSet(MapEntityFilterSet):
    class Meta:
        model = Sector
        fields = ("code", "name")


class ComplexModelFilterSet(MapEntityFilterSet):
    public = BooleanFilter(field_name="public", lookup_expr="exact")

    class Meta:
        model = ComplexModel
        fields = ("public", "name", "located_in", "road")
