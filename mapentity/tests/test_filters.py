from django.test import TestCase
from django.contrib.gis.geos import GEOSGeometry
from django.conf import settings

from mapentity import API_SRID
from .models import MushroomSpot, WeatherStation
from ..filters import PythonPolygonFilter, PolygonFilter


class PolygonTest(object):

    def test_should_return_all_if_filter_empty(self):
        result = self.filter.filter(self.model.objects.all(), None)
        self.assertEqual(3, len(result))

    def test_should_include_null_geometry_in_search_results(self):
        shape = GEOSGeometry('POLYGON((20 20, 40 20, 40 40, 20 40, 20 20))')
        result = self.filter.filter(self.model.objects.all(), shape)
        self.assertEqual(1, len(result))

    def test_should_consider_filter_shape_as_api_srid(self):
        shape = GEOSGeometry('POLYGON((-1 2, -1 4, 1 4, 1 2, -1 2))')
        result = self.filter.filter(self.model.objects.all(), shape)
        self.assertEqual(1, len(result))  # one of them is None

    def test_should_filter_queryset_intersecting_shape(self):
        shape = GEOSGeometry('POLYGON((0 -1, 4 -1, 4 1, 0 1, 0 -1))', srid=settings.SRID)
        shape.transform(API_SRID)
        result = self.filter.filter(self.model.objects.all(), shape)
        self.assertEqual(2, len(result))


class PolygonFilterTest(PolygonTest, TestCase):

    def setUp(self):
        self.model = WeatherStation
        self.none = WeatherStation.objects.create()

        self.basic = WeatherStation.objects.create(geom='SRID=%s;POINT(2 0)' % settings.SRID)
        self.outside = WeatherStation.objects.create(geom='SRID=%s;POINT(10 10)' % settings.SRID)

        self.filter = PolygonFilter()


class PythonPolygonFilterTest(PolygonTest, TestCase):

    def setUp(self):
        self.model = MushroomSpot
        self.none = MushroomSpot.objects.create()

        self.basic = MushroomSpot.objects.create(serialized='SRID=%s;LINESTRING(0 0, 10 0)' % settings.SRID)
        self.outside = MushroomSpot.objects.create(serialized='SRID=%s;LINESTRING(0 10, 10 10)' % settings.SRID)

        self.filter = PythonPolygonFilter()
