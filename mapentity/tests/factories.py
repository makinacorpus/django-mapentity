from factory.django import DjangoModelFactory

from test_app import models as dummy_models


class DummyModelFactory(DjangoModelFactory):
    class Meta:
        model = dummy_models.DummyModel

    name = "Dummy object"
    geom = 'POINT(0 0)'
    public = True
