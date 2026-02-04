from django.contrib.gis.db import models
from django.utils.translation import gettext_lazy as _

from mapentity.models import MapEntityMixin


class SinglePointModel(MapEntityMixin, models.Model):
    name = models.CharField(max_length=100, verbose_name=_("Name"))
    geom = models.PointField(srid=4326)

    def __str__(self):
        return self.name or str(self.pk)

    class Meta:
        verbose_name = _("Single Point Model")
        verbose_name_plural = _("Single Point Models")


class MultiPointModel(MapEntityMixin, models.Model):
    name = models.CharField(max_length=100, verbose_name=_("Name"))
    geom = models.MultiPointField(srid=4326)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = _("Multi Point Model")
        verbose_name_plural = _("Multi Point Models")


class SingleLineStringModel(MapEntityMixin, models.Model):
    name = models.CharField(max_length=100, verbose_name=_("Name"))
    geom = models.LineStringField(srid=4326)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = _("Single LineString Model")
        verbose_name_plural = _("Single LineString Models")


class MultiLineStringModel(MapEntityMixin, models.Model):
    name = models.CharField(max_length=100, verbose_name=_("Name"))
    geom = models.MultiLineStringField(srid=4326)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = _("Multi LineString Model")
        verbose_name_plural = _("Multi LineString Models")


class SinglePolygonModel(MapEntityMixin, models.Model):
    name = models.CharField(max_length=100, verbose_name=_("Name"))
    geom = models.PolygonField(srid=4326)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = _("Single Polygon Model")
        verbose_name_plural = _("Single Polygon Models")


class MultiPolygonModel(MapEntityMixin, models.Model):
    name = models.CharField(max_length=100, verbose_name=_("Name"))
    geom = models.MultiPolygonField(srid=4326)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = _("Multi Polygon Model")
        verbose_name_plural = _("Multi Polygon Models")


class GeometryModel(MapEntityMixin, models.Model):
    name = models.CharField(max_length=100, verbose_name=_("Name"))
    geom = models.GeometryField(srid=4326)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = _("Geometry Model")
        verbose_name_plural = _("Geometry Models")


class GeometryCollectionModel(MapEntityMixin, models.Model):
    name = models.CharField(max_length=100, verbose_name=_("Name"))
    geom = models.GeometryCollectionField(srid=4326)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = _("GeometryCollection Model")
        verbose_name_plural = _("GeometryCollection Models")
