import random

from django.db.models import Case, CharField, Value, When
from vectortiles import VectorLayer

from test_project.test_app.models import DummyModel


class DummyLayer(VectorLayer):
    id = "dummymodel"  # id for data layer in vector tile
    geom_field = "geom"  # geom field to consider in qs
    tile_fields = ("id", "color")

    def get_queryset(self):
        colors = ["red", "blue", "green", "yellow", "purple", "orange", "pink", "cyan"]
        qs = DummyModel.objects.all()
        ids = list(qs.values_list("pk", flat=True))
        color_map = {pk: random.choice(colors) for pk in ids}
        whens = [When(pk=pk, then=Value(color)) for pk, color in color_map.items()]
        return qs.annotate(
            color=Case(*whens, default=Value("red"), output_field=CharField())
        )
