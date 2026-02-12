import random

import factory
from django.contrib.gis.geos import LineString, Point, Polygon

from test_project.test_app.models import (
    City,
    ComplexModel,
    DummyModel,
    ManikinModel,
    MultiGeomModel,
    Road,
    Sector,
    Tag,
)


class TagFactory(factory.django.DjangoModelFactory):
    label = factory.Sequence(lambda n: f"Tag {n}")

    class Meta:
        model = Tag


class CityFactory(factory.django.DjangoModelFactory):
    name = factory.Sequence(lambda n: f"City {n}")

    @factory.lazy_attribute
    def geom(self):
        points = [
            (random.uniform(-180, 180), random.uniform(-80, 80)) for _ in range(3)
        ]
        points.append(points[0])
        return Polygon(points, srid=4326)

    class Meta:
        model = City


class RoadFactory(factory.django.DjangoModelFactory):
    name = factory.Sequence(lambda n: f"Road {n}")

    @factory.lazy_attribute
    def geom(self):
        points = [
            (random.uniform(-180, 180), random.uniform(-80, 80)) for _ in range(2)
        ]
        return LineString(points, srid=4326)

    class Meta:
        model = Road


class SectorFactory(factory.django.DjangoModelFactory):
    code = factory.Sequence(lambda n: f"#{n}")  # id (!) with max_length=6
    name = factory.Sequence(lambda n: f"Name {n}")

    class Meta:
        model = Sector


class DummyModelFactory(factory.django.DjangoModelFactory):
    name = "a dummy model"
    short_description = "a dummy model with a dummy name, a dummy geom, dummy tags, dummy makinins. It is the perfect object to make tests"

    @factory.lazy_attribute
    def geom(self):
        x = random.randint(-18000, 18000)
        y = random.randint(-8000, 8000)
        return Point(x / 100, y / 100, srid=4326)

    @factory.post_generation
    def tags(obj, create, extracted=None, **kwargs):
        if create:
            if extracted:
                for tag in extracted:
                    obj.tags.add(tag)
            else:
                obj.tags.add(TagFactory.create())

    @factory.post_generation
    def makinins(obj, create, extracted=None, **kwargs):
        if create:
            if extracted:
                for tag in extracted:
                    obj.tags.add(tag)
            else:
                ManikinModel.objects.create(dummy=obj)

    class Meta:
        model = DummyModel


class ComplexModelFactory(factory.django.DjangoModelFactory):
    name = "geo point"
    internal_reference = "QF536-321"

    @factory.lazy_attribute
    def geom(self):
        x = random.randint(-18000, 18000)
        y = random.randint(-8000, 8000)
        return Point(x / 100, y / 100, srid=4326)

    @factory.post_generation
    def tags(obj, create, extracted=None, **kwargs):
        if create:
            if extracted:
                for tag in extracted:
                    obj.tags.add(tag)
            else:
                obj.tags.add(TagFactory.create())

    @factory.lazy_attribute
    def road(self):
        return RoadFactory.create()

    @factory.lazy_attribute
    def dummy_model(self):
        return DummyModelFactory.create()

    @factory.lazy_attribute
    def located_in(self):
        return CityFactory.create()

    class Meta:
        model = ComplexModel


class MultiGeomModelFactory(factory.django.DjangoModelFactory):
    name = factory.Sequence(lambda n: f"Multi Geom {n}")

    @factory.lazy_attribute
    def geom(self):
        # Create a LineString in SRID 2154 (French Lambert 93)
        points = [(700000, 6600000), (700100, 6600100)]
        return LineString(points, srid=2154)

    @factory.lazy_attribute
    def parking(self):
        # Optional Point field
        return Point(700050, 6600050, srid=2154)

    @factory.lazy_attribute
    def points(self):
        # Optional MultiPoint field
        from django.contrib.gis.geos import MultiPoint
        points = [Point(700020, 6600020, srid=2154), Point(700080, 6600080, srid=2154)]
        return MultiPoint(*points, srid=2154)

    class Meta:
        model = MultiGeomModel
