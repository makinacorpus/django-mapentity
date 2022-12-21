import factory
import random
from django.contrib.gis.geos import Point
from test_app.models import DummyModel, ManikinModel, Tag


class TagFactory(factory.django.DjangoModelFactory):
    label = factory.Sequence(lambda n: "Tag %s" % n)

    class Meta:
        model = Tag


class DummyModelFactory(factory.django.DjangoModelFactory):
    name = 'a dummy model'

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
