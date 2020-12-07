from factory import post_generation
from factory.django import DjangoModelFactory

from test_app import models as test_models


class DummyModelFactory(DjangoModelFactory):
    class Meta:
        model = test_models.DummyModel

    name = "Dummy object"
    geom = 'POINT(0 0)'
    public = True


class TagFactory(DjangoModelFactory):
    class Meta:
        model = test_models.Tag

    label = "Easy"


class MushroomSpotFactory(DjangoModelFactory):
    class Meta:
        model = test_models.MushroomSpot

    name = "Mushroom spot"
    geom = 'POINT(0 0)'

    @post_generation
    def tags(obj, create, extracted=None, **kwargs):
        if create:
            obj.tags.add(TagFactory.create().pk)
