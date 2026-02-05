from mapentity.forms import MapEntityForm

from .models import (
    City,
    DummyModel,
    MushroomSpot,
    Road,
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


class CityForm(MapEntityForm):
    class Meta:
        model = City
        fields = ("name", "geom")


class SupermarketForm(MapEntityForm):
    geomfields = ["geom", "parking"]

    class Meta:
        model = Supermarket
        fields = ("name", "geom", "parking", "tag")
