from mapentity.forms import MapEntityForm

from .models import (
    City,
    DummyAptModel,
    DummyModel,
    MushroomSpot,
    Road,
    Supermarket,
)


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


class CityForm(MapEntityForm):
    class Meta:
        model = City
        fields = ("name", "geom")


class SupermarketForm(MapEntityForm):
    geomfields = ["geom", "parking"]

    class Meta:
        model = Supermarket
        fields = ("name", "geom", "parking", "tag")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["parking"].widget.target_map = "geom"
