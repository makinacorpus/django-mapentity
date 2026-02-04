from mapentity.forms import MapEntityForm

from .models import (
    City,
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


class CityForm(MapEntityForm):
    class Meta:
        model = City
        fields = ("name", "geom")


class SupermarketForm(MapEntityForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["parking"].widget.target_map = "geom"

    class Meta:
        model = Supermarket
        fields = ("name", "geom", "parking", "tag")
