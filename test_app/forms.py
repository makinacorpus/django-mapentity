from mapentity.forms import MapEntityForm
from test_app.models import Road, DummyModel


class DummyModelForm(MapEntityForm):
    class Meta:
        model = DummyModel
        fields = ("name", "short_description", "description", "geom", "public", "tags")


class RoadForm(MapEntityForm):
    class Meta:
        model = Road
        fields = ("name", "geom")
