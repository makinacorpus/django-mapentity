from django.db.models import loading
from django.contrib.gis.db import models
from django.contrib.gis.geos import GEOSGeometry


class MushroomSpot(models.Model):
    serialized = models.CharField(max_length=200, null=True, default=None)

    """geom as python attribute"""
    @property
    def geom(self):
        if self.serialized is None:
            return None
        return GEOSGeometry(self.serialized)


class WeatherStation(models.Model):
    geom = models.PointField(null=True, default=None, srid=2154)

    objects = models.GeoManager()


loading.cache.loaded = False
