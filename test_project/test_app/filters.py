from mapentity.filters import MapEntityFilterSet
from test_project.test_app.models import DummyModel, Road


class DummyModelFilterSet(MapEntityFilterSet):
    class Meta(MapEntityFilterSet.Meta):
        model = DummyModel
        fields = ("public", "name", "tags")


class RoadFilterSet(MapEntityFilterSet):
    class Meta(MapEntityFilterSet.Meta):
        model = Road
        fields = ("id", "name")
