from mapentity.forms import MapEntityForm
from test_app.models import Road, DummyModel, MushroomSpot, DummyAptModel


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

class DummyAptModelForm(MapEntityForm):
    class Meta:
        model = DummyAptModel  # Assuming DummyaptModel is similar to DummyModel
        fields = ("name", "short_description", "description", "geom", "public", "tags")