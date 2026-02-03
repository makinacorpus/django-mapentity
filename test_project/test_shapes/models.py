from django.contrib.gis.db import models

from mapentity.models import MapEntityMixin


class SinglePointModel(MapEntityMixin, models.Model):
    name = models.CharField(max_length=100)
    geom = models.PointField(srid=4326)

    def __str__(self):
        return self.name


class MultiPointModel(MapEntityMixin, models.Model):
    name = models.CharField(max_length=100)
    geom = models.MultiPointField(srid=4326)

    def __str__(self):
        return self.name


class SingleLineStringModel(MapEntityMixin, models.Model):
    name = models.CharField(max_length=100)
    geom = models.LineStringField(srid=4326)

    def __str__(self):
        return self.name


class MultiLineStringModel(MapEntityMixin, models.Model):
    name = models.CharField(max_length=100)
    geom = models.MultiLineStringField(srid=4326)

    def __str__(self):
        return self.name


class SinglePolygonModel(MapEntityMixin, models.Model):
    name = models.CharField(max_length=100)
    geom = models.PolygonField(srid=4326)

    def __str__(self):
        return self.name


class MultiPolygonModel(MapEntityMixin, models.Model):
    name = models.CharField(max_length=100)
    geom = models.MultiPolygonField(srid=4326)

    def __str__(self):
        return self.name


class GeometryModel(MapEntityMixin, models.Model):
    name = models.CharField(max_length=100)
    geom = models.GeometryField(srid=4326)

    def __str__(self):
        return self.name


class GeometryCollectionModel(MapEntityMixin, models.Model):
    name = models.CharField(max_length=100)
    geom = models.GeometryCollectionField(srid=4326)

    def __str__(self):
        return self.name
