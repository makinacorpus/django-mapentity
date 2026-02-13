from django.contrib.gis.forms import LineStringField

from mapentity.forms import MapEntityForm
from mapentity.widgets import MapWidget

from .models import (
    City,
    DummyModel,
    MultiGeomModel,
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


class MultiGeomForm(MapEntityForm):
    geom = LineStringField()
    geomfields = ["geom", "parking", "points"]

    class Meta:
        model = MultiGeomModel
        fields = ("name", "geom", "parking", "points")
        widgets = {
            "parking": MapWidget(
                attrs={
                    "target_map": "geom",
                    "custom_icon": "parking.svg",
                }
            ),
            "points": MapWidget(
                attrs={
                    "target_map": "geom",
                    "custom_icon": "points.svg",
                }
            ),
        }
