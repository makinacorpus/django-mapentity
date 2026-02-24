from django_filters import BooleanFilter

from mapentity.filters import MapEntityFilterSet

from .models import (
    City,
    ComplexModel,
    DollModel,
    DummyModel,
    ManikinModel,
    MultiGeomModel,
    MushroomSpot,
    Road,
    Sector,
)


class MushroomSpotFilterSet(MapEntityFilterSet):
    class Meta(MapEntityFilterSet.Meta):
        model = MushroomSpot
        fields = ("id", "name")


class DummyModelFilterSet(MapEntityFilterSet):
    class Meta(MapEntityFilterSet.Meta):
        model = DummyModel
        fields = ("public", "name", "tags")


class RoadFilterSet(MapEntityFilterSet):
    class Meta(MapEntityFilterSet.Meta):
        model = Road
        fields = ("id", "name", "tag")


class DollModelFilterSet(MapEntityFilterSet):
    class Meta(MapEntityFilterSet.Meta):
        model = DollModel
        fields = ("id",)


class ManikinModelFilterSet(MapEntityFilterSet):
    class Meta(MapEntityFilterSet.Meta):
        model = ManikinModel
        fields = ("id", "dummy")


class CityFilterSet(MapEntityFilterSet):
    class Meta(MapEntityFilterSet.Meta):
        model = City
        fields = ("id", "name")


class SectorFilterSet(MapEntityFilterSet):
    class Meta(MapEntityFilterSet.Meta):
        model = Sector
        fields = ("code", "name")


class MultiGeomModelFilterSet(MapEntityFilterSet):
    class Meta:
        model = MultiGeomModel
        fields = ("id", "name")


class ComplexModelFilterSet(MapEntityFilterSet):
    public = BooleanFilter(field_name="public", lookup_expr="exact")

    class Meta(MapEntityFilterSet.Meta):
        model = ComplexModel
        fields = ("public", "name", "located_in", "road")
