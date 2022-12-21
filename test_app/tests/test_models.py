from django.test import TestCase
from django.test.utils import override_settings

from mapentity.registry import app_settings


from ..models import Road, DummyModel


class MapEntityDuplicateMixinTest(TestCase):

    def test_cant_duplicate(self):
        sample_object = Road.objects.create()
        sample_object.duplicate()
        self.assertEqual(1, Road.objects.count())

    def test_can_duplicate(self):
        sample_object = DummyModel.objects.create()
        sample_object.duplicate()
        self.assertEqual(2, DummyModel.objects.count())
