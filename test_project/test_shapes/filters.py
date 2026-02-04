from mapentity.filters import MapEntityFilterSet

from .models import (
    GeometryCollectionModel,
    GeometryModel,
    MultiLineStringModel,
    MultiPointModel,
    MultiPolygonModel,
    SingleLineStringModel,
    SinglePointModel,
    SinglePolygonModel,
)


class SinglePointModelFilterSet(MapEntityFilterSet):
    class Meta:
        model = SinglePointModel
        fields = ("id", "name")


class MultiPointModelFilterSet(MapEntityFilterSet):
    class Meta:
        model = MultiPointModel
        fields = ("id", "name")


class SingleLineStringModelFilterSet(MapEntityFilterSet):
    class Meta:
        model = SingleLineStringModel
        fields = ("id", "name")


class MultiLineStringModelFilterSet(MapEntityFilterSet):
    class Meta:
        model = MultiLineStringModel
        fields = ("id", "name")


class SinglePolygonModelFilterSet(MapEntityFilterSet):
    class Meta:
        model = SinglePolygonModel
        fields = ("id", "name")


class MultiPolygonModelFilterSet(MapEntityFilterSet):
    class Meta:
        model = MultiPolygonModel
        fields = ("id", "name")


class GeometryModelFilterSet(MapEntityFilterSet):
    class Meta:
        model = GeometryModel
        fields = ("id", "name")


class GeometryCollectionModelFilterSet(MapEntityFilterSet):
    class Meta:
        model = GeometryCollectionModel
        fields = ("id", "name")
