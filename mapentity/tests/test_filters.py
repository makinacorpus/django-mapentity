from django.test import TestCase
from django.contrib.gis.geos import GEOSGeometry

from .models import MushroomSpot, WeatherStation
from ..filters import PythonPolygonFilter, PolygonFilter
from .. import API_SRID
from django.conf import settings


class PolygonFilterTest(TestCase):

    def setUp(self):
        self.none = WeatherStation.objects.create()

        self.basic = WeatherStation.objects.create(geom='POINT(2 0)')
        self.outside = WeatherStation.objects.create(geom='POINT(10 10)')

        self.filter = PolygonFilter()

    def test_should_return_all_if_filter_empty(self):
        result = self.filter.filter(WeatherStation.objects.all(), None)
        self.assertEqual(3, len(result))

    def test_should_not_return_any_if_null_geometry(self):
        shape = GEOSGeometry('POLYGON((20 20, 40 20, 40 40, 20 40, 20 20))')
        result = self.filter.filter(WeatherStation.objects.all(), shape)
        self.assertEqual(0, len(result))

    def test_should_consider_filter_shape_as_api_srid(self):
        shape = GEOSGeometry('POLYGON((-1 2, -1 4, 1 4, 1 2, -1 2))')
        result = self.filter.filter(WeatherStation.objects.all(), shape)
        self.assertEqual(0, len(result))

    def test_should_consider_filter_shape_by_geom(self):
        shape = GEOSGeometry('POLYGON((0 -1, 4 -1, 4 1, 0 1, 0 -1))', srid=2154)
        shape.transform(API_SRID)
        result = self.filter.filter(WeatherStation.objects.all(), shape)
        self.assertEqual(1, len(result))


class PythonPolygonFilterTest(object):

    def setUp(self):
        self.none = MushroomSpot.objects.create()

        self.basic = MushroomSpot.objects.create(serialized='SRID=2154;LINESTRING(0 0, 10 0)')
        self.outside = MushroomSpot.objects.create(serialized='SRID=2154;LINESTRING(0 10, 10 10)')

        self.filter = PythonPolygonFilter()

    def test_should_return_all_if_filter_empty(self):
        result = self.filter.filter(MushroomSpot.objects.all(), None)
        self.assertEqual(3, len(result))

    def test_should_return_all_with_null_geometry(self):
        shape = GEOSGeometry('POLYGON((20 20, 40 20, 40 40, 20 40, 20 20))')
        result = self.filter.filter(MushroomSpot.objects.all(), shape)
        self.assertEqual(1, len(result))

    def test_should_consider_filter_shape_as_api_srid(self):
        shape = GEOSGeometry('POLYGON((-1 2, -1 4, 1 4, 1 2, -1 2))')
        result = self.filter.filter(MushroomSpot.objects.all(), shape)
        self.assertEqual(1, len(result))  # one of them is None

    def test_should_consider_filter_shape_by_geom(self):
        shape = GEOSGeometry('POLYGON((0 -1, 4 -1, 4 1, 0 1, 0 -1))', srid=2154)
        shape.transform(settings.API_SRID)
        result = self.filter.filter(MushroomSpot.objects.all(), shape)
        self.assertEqual(2, len(result))
