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
    geomfields = ["geom", "parking", "points"]

    class Meta:
        model = MultiGeomModel
        fields = ("name", "geom", "parking", "points")
        widgets = {
            "parking": MapWidget(
                attrs={
                    "target_map": "geom",
                    "custom_icon": '<span style="display:inline-block;width:18px;height:18px;background:#2196F3;color:#fff;text-align:center;font-weight:bold;line-height:18px;font-size:12px;">P</span>',
                }
            ),
            "points": MapWidget(
                attrs={
                    "target_map": "geom",
                }
            ),
        }
