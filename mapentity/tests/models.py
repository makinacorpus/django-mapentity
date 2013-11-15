from django.db.models import loading
from django.contrib.gis.db import models
from django.contrib.gis.geos import GEOSGeometry

from mapentity.models import MapEntityMixin


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


class DummyModel(MapEntityMixin, models.Model):

    @classmethod
    def get_jsonlist_url(self):
        return ''

    @classmethod
    def get_generic_detail_url(self):
        return ''

    @classmethod
    def get_add_url(self):
        return ''

    @classmethod
    def get_detail_url(self):
        return '/dummy-detail'

    @classmethod
    def get_update_url(self):
        return ''

    @classmethod
    def get_delete_url(self):
        return ''


loading.cache.loaded = False
