from mapentity.forms import MapEntityForm
from test_project.test_app.models import DummyModel, MushroomSpot, Road


class DummyModelForm(MapEntityForm):
    class Meta:
        model = DummyModel
        fields = ("name", "short_description", "description", "geom", "public", "tags")


class RoadForm(MapEntityForm):
    class Meta:
        model = Road
        fields = ("name", "geom")


class MushroomSpotForm(MapEntityForm):
    geomfields = []

    class Meta:
        model = MushroomSpot
        fields = "__all__"
