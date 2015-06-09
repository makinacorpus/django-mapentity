from django.db.models import loading
from django.contrib.gis.db import models
from django.contrib.gis.geos import GEOSGeometry
from django.utils.translation import ugettext_lazy as _

from mapentity.models import MapEntityMixin


class MushroomSpot(MapEntityMixin, models.Model):
    name = models.CharField(max_length=100, default='Empty')
    serialized = models.CharField(max_length=200, null=True, default=None)
    number = models.IntegerField(null=True, default=42)
    size = models.FloatField(null=True, default=3.14159)
    boolean = models.BooleanField(default=True)

    def __init__(self, *args, **kwargs):
        super(MushroomSpot, self).__init__(*args, **kwargs)
        self._geom = None

    """geom as python attribute"""
    @property
    def geom(self):
        if self._geom is not None:
            return self._geom
        if self.serialized is None:
            return None
        return GEOSGeometry(self.serialized)

    @geom.setter  # NOQA
    def geom(self, value):
        self._geom = value


class WeatherStation(models.Model):
    geom = models.PointField(null=True, default=None, srid=2154)

    objects = models.GeoManager()


class DummyModel(MapEntityMixin, models.Model):
    name = models.CharField(blank=True, default='', max_length=128)
    geom = models.PointField(null=True, default=None)
    date_update = models.DateTimeField(auto_now=True)
    public = models.BooleanField(default=False)

    objects = models.GeoManager()

    def is_public(self):
        return self.public

    class Meta:
        verbose_name = _(u"Dummy Model")

loading.cache.loaded = False
