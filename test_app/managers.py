from django.contrib.gis.db.models import GeometryField
from django.db import models
from django.db.models import Func


class MushroomSpotManager(models.Manager):
    def get_queryset(self):
        return (
            super()
            .get_queryset()
            .annotate(
                geom=Func(
                    "serialized", function="GeomFromEWKT", output_field=GeometryField()
                )
            )
        )
