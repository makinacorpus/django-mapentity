import factory
import random
from django.contrib.gis.geos import Point
from test_app.models import DummyModel


class DummyModelFactory(factory.django.DjangoModelFactory):
    name = 'a dummy model'

    @factory.lazy_attribute
    def geom(self):
        x = random.randint(-18000, 18000)
        y = random.randint(-8000, 8000)
        return Point(x / 100, y / 100, srid=4326)

    class Meta:
        model = DummyModel
