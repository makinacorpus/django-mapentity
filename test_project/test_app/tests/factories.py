import random

import factory
from django.contrib.gis.geos import Point

from test_project.test_app.models import (
    City,
    DummyModel,
    GeoPoint,
    ManikinModel,
    Sector,
    Tag,
    WeatherStation,
)


class TagFactory(factory.django.DjangoModelFactory):
    label = factory.Sequence(lambda n: f"Tag {n}")

    class Meta:
        model = Tag


class CityFactory(factory.django.DjangoModelFactory):
    name = factory.Sequence(lambda n: f"City {n}")

    @factory.lazy_attribute
    def geom(self):
        x = random.randint(-18000, 18000)
        y = random.randint(-8000, 8000)
        return Point(x / 100, y / 100, srid=4326)

    class Meta:
        model = City


class WeatherStationFactory(factory.django.DjangoModelFactory):
    @factory.lazy_attribute
    def geom(self):
        x = random.randint(-18000, 18000)
        y = random.randint(-8000, 8000)
        return Point(x / 100, y / 100, srid=4326)

    class Meta:
        model = WeatherStation


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


class GeoPointFactory(factory.django.DjangoModelFactory):
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
    def sector(self):
        return SectorFactory.create()

    @factory.lazy_attribute
    def weather_station(self):
        return WeatherStationFactory.create()

    class Meta:
        model = GeoPoint
