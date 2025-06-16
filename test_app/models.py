from django.contrib.gis.db import models
from django.contrib.gis.geos import GEOSGeometry
from django.utils.translation import gettext_lazy as _
from paperclip.models import FileType as BaseFileType, Attachment as BaseAttachment, License as BaseLicense

from mapentity.models import MapEntityMixin
from django.conf import settings


class FileType(BaseFileType):
    pass


class License(BaseLicense):
    pass


class Attachment(BaseAttachment):
    pass


class Tag(models.Model):
    label = models.CharField(max_length=100)

    def __str__(self):
        return self.label


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
    """ Not a Mapentity model. should not be displayed in menu entries """
    geom = models.PointField(null=True, default=None)


class Road(MapEntityMixin, models.Model):
    """ Linestring Mapentity model """
    name = models.CharField(max_length=100, default='Empty')
    geom = models.LineStringField(null=True, default=None, srid=2154)
    can_duplicate = False

    @property
    def name_display(self):
        return _(f'<a href="{self.get_detail_url()}">{self.name}</a>')


class DummyModel(MapEntityMixin, models.Model):
    name = models.CharField(blank=True, default='', max_length=128)
    short_description = models.TextField(blank=True, default='', help_text=_('Short description'))
    description = models.TextField(blank=True, default='')
    geom = models.PointField(null=True, default=None)
    date_update = models.DateTimeField(auto_now=True, db_index=True)
    public = models.BooleanField(default=False)
    tags = models.ManyToManyField(Tag, blank=True)

    def __str__(self):
        return "{} ({})".format(self.name, self.pk)

    def is_public(self):
        return self.public

    def name_display(self):
        return _(f'<a href="{self.get_detail_url()}">{self.name or self.id}</a>')

    class Meta:
        verbose_name = _("Dummy Model")


class DummyAptModel(MapEntityMixin, models.Model):
    name = models.CharField(blank=True, default='', max_length=128)
    short_description = models.TextField(blank=True, default='', help_text=_('Short description'))
    description = models.TextField(blank=True, default='')
    geom = models.GeometryCollectionField(verbose_name="DummyApt Models", srid=settings.SRID, null=True)
    date_update = models.DateTimeField(auto_now=True, db_index=True)
    public = models.BooleanField(default=False)
    tags = models.ManyToManyField(Tag, blank=True)

    def __str__(self):
        return "{} ({})".format(self.name, self.pk)

    def is_public(self):
        return self.public

    def name_display(self):
        return _(f'<a href="{self.get_detail_url()}">{self.name or self.id}</a>')

    class Meta:
        verbose_name = _("DummyApt Model")



class DollModel(MapEntityMixin, models.Model):
    dummies = models.ManyToManyField(DummyModel)

    def __str__(self):
        return "Dummies"


class ManikinModel(MapEntityMixin, models.Model):
    dummy = models.ForeignKey(DummyModel, related_name='manikins', null=True, default=None, on_delete=models.SET_NULL)
    can_duplicate = False

    def __str__(self):
        return str(self.dummy)


class City(MapEntityMixin, models.Model):
    geom = models.PolygonField(null=True, default=None, srid=2154)
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name


class Supermarket(MapEntityMixin, models.Model):
    """ Linestring Mapentity model """
    geom = models.PolygonField(null=True, default=None, srid=2154)
    parking = models.PointField(null=True, default=None, srid=2154)
    tag = models.ForeignKey(Tag, null=True, default=None, on_delete=models.SET_NULL)


class Sector(MapEntityMixin, models.Model):
    code = models.CharField(primary_key=True, max_length=6)
    name = models.CharField(max_length=100)
    skip_attachments = True

    def __str__(self):
        return self.name
