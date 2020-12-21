from django.contrib.gis.db import models
from django.test import TestCase

from mapentity.registry import registry
from mapentity.models import MapEntityMixin

from test_app.models import DummyModel


class ModelDoNotExist(MapEntityMixin, models.Model):
    pass

    class Meta:
        abstract = True


class RegistryTest(TestCase):
    def test_already_register(self):
        patterns = registry.register(model=DummyModel, menu=False)
        self.assertEqual(patterns, [])
