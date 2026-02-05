from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.contrib.gis.db import models
from django.contrib.gis.geos import GEOSGeometry
from django.utils.translation import gettext_lazy as _
from paperclip.models import Attachment as BaseAttachment
from paperclip.models import FileType as BaseFileType
from paperclip.models import License as BaseLicense

from mapentity.models import MapEntityMixin

from .managers import MushroomSpotManager


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
    name = models.CharField(max_length=100, default="Empty", verbose_name=_("Name"))
    serialized = models.CharField(max_length=200, null=True, default=None)
    number = models.IntegerField(null=True, default=42)
    size = models.FloatField(null=True, default=3.14159)
    boolean = models.BooleanField(default=True)
    tags = models.ManyToManyField(Tag, blank=True)
    objects = MushroomSpotManager()

    def get_display_label(self):
        return self.name

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if not hasattr(self, "geom"):
            self.geom = GEOSGeometry(self.serialized) if self.serialized else None

    class Meta:
        verbose_name = _("Mushroom Spot")
        verbose_name_plural = _("Mushroom Spots")


class WeatherStation(models.Model):
    """Not a Mapentity model. should not be displayed in menu entries"""

    geom = models.PointField(null=True, default=None)


class Road(MapEntityMixin, models.Model):
    """Linestring Mapentity model"""

    name = models.CharField(max_length=100, default="Empty", verbose_name=_("Name"))
    geom = models.LineStringField(null=True, default=None, srid=2154)
    can_duplicate = False

    def get_display_label(self):
        return self.name

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = _("Road")
        verbose_name_plural = _("Roads")


class DummyModel(MapEntityMixin, models.Model):
    name = models.CharField(
        blank=True, default="", max_length=128, verbose_name=_("Name")
    )
    short_description = models.TextField(
        blank=True, default="", help_text=_("Short description")
    )
    description = models.TextField(blank=True, default="")
    geom = models.PointField(null=True, default=None)
    date_update = models.DateTimeField(auto_now=True, db_index=True)
    public = models.BooleanField(default=False)
    tags = models.ManyToManyField(Tag, blank=True)

    def __str__(self):
        return f"{self.name} ({self.pk})"

    def is_public(self):
        return self.public

    def get_display_label(self):
        return f"{self.name or self.id}"

    class Meta:
        verbose_name = _("Dummy Model")
        verbose_name_plural = _("Dummy Models")


class DollModel(MapEntityMixin, models.Model):
    dummies = models.ManyToManyField(DummyModel)

    def __str__(self):
        return "Dummies"


class ManikinModel(MapEntityMixin, models.Model):
    dummy = models.ForeignKey(
        DummyModel,
        related_name="manikins",
        null=True,
        default=None,
        on_delete=models.SET_NULL,
    )
    can_duplicate = False

    def __str__(self):
        return str(self.dummy)


class City(MapEntityMixin, models.Model):
    geom = models.PolygonField(null=True, default=None, srid=2154)
    name = models.CharField(max_length=100, verbose_name=_("Name"))

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = _("City")
        verbose_name_plural = _("Cities")


class Sector(MapEntityMixin, models.Model):
    code = models.CharField(primary_key=True, max_length=6)
    name = models.CharField(max_length=100, verbose_name=_("Name"))
    skip_attachments = True

    def __str__(self):
        return self.name


class HiddenModel(MapEntityMixin, models.Model):
    """A MapEntity model with menu=False for testing hidden menu functionality"""

    name = models.CharField(max_length=100, verbose_name=_("Name"))
    geom = models.PolygonField(null=True, default=None, srid=2154)

    class Meta:
        verbose_name = _("Hidden Model")
        verbose_name_plural = _("Hidden Models")


class ComplexModel(MapEntityMixin, models.Model):
    public = models.BooleanField(default=False)
    geom = models.PointField(null=True, default=None)
    located_in = models.ForeignKey(
        City, on_delete=models.SET_NULL, null=True, blank=True
    )
    road = models.ForeignKey(Road, on_delete=models.CASCADE)
    name = models.CharField(max_length=255, verbose_name=_("Name"))
    dummy_model = models.OneToOneField(DummyModel, null=True, on_delete=models.CASCADE)
    internal_reference = models.CharField(max_length=20, editable=False)
    content_type = models.ForeignKey(
        ContentType, blank=True, null=True, on_delete=models.SET_NULL
    )
    object_id = models.PositiveIntegerField(blank=True, null=True)
    related_object = GenericForeignKey("content_type", "object_id")
    tags = models.ManyToManyField(Tag, blank=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = _("Complex Model")
        verbose_name_plural = _("Complex Models")
