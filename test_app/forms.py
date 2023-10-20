from mapentity.forms import MapEntityForm
from test_app.models import Road


class RoadForm(MapEntityForm):
    class Meta:
        model = Road
        fields = ("name", "geom")
