from django.contrib.gis.db import models
from django.contrib.gis.geos import GEOSGeometry
from django.utils.translation import ugettext_lazy as _

from mapentity.models import MapEntityMixin
from paperclip.models import FileType as BaseFileType, Attachment as BaseAttachment


class FileType(BaseFileType):
    pass


class Attachment(BaseAttachment):
    pass


class Tag(models.Model):
    label = models.CharField(max_length=100)

    def __str__(self):
        return self.label


class Theme(models.Model):
    name = models.CharField(max_length=128)

    def __str__(self):
        return self.name


class MushroomSpot(MapEntityMixin, models.Model):
    name = models.CharField(max_length=100, default='Empty')
    serialized = models.CharField(max_length=200, null=True, default=None)
    number = models.IntegerField(null=True, default=42)
    size = models.FloatField(null=True, default=3.14159)
    boolean = models.BooleanField(default=True)
    tags = models.ManyToManyField(Tag)

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


class Path(MapEntityMixin, models.Model):
    geom = models.LineStringField(srid=2154, spatial_index=False)


class AnyGeomModel(MapEntityMixin, models.Model):
    name = models.CharField(blank=True, default='', max_length=128)
    geom = models.GeometryField(srid=2154)
    tags = models.ManyToManyField(Tag, related_name="whatevergeoms", blank=True,)


class DummyModel(MapEntityMixin, models.Model):
    name = models.CharField(blank=True, default='', max_length=128)
    geom = models.PointField(null=True, default=None)
    date_update = models.DateTimeField(auto_now=True)
    public = models.BooleanField(default=False)

    def __str__(self):
        return "{} ({})".format(self.name, self.pk)

    def is_public(self):
        return self.public

    class Meta:
        verbose_name = _(u"Dummy Model")
