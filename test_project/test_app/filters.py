from django_filters import rest_framework as rest_filters

from mapentity.filters import MapEntityFilterSet
from test_project.test_app.models import DummyModel, Road


class DummyModelFilterSet(MapEntityFilterSet):
    public = rest_filters.BooleanFilter(field_name="public", lookup_expr="exact")

    class Meta(MapEntityFilterSet.Meta):
        model = DummyModel
        fields = ("public", "name", "tags")


class RoadFilterSet(MapEntityFilterSet):
    class Meta(MapEntityFilterSet.Meta):
        model = Road
        fields = ("id", "name")
