import os
from io import StringIO
from unittest.mock import patch

from django import VERSION
from django.conf import settings
from django.contrib.gis import gdal
from django.contrib.gis.db.models import GeometryField
from django.http import HttpResponse
from django.test import TestCase
from django.test.utils import override_settings
from django.utils import translation

from mapentity.registry import app_settings
from mapentity.serializers import ZipShapeSerializer, CSVSerializer
from ..models import MushroomSpot, Tag, Supermarket


class CommonShapefileSerializerMixin(object):
    def getShapefileLayers(self):
        shapefiles = self.serializer.path_directory
        shapefiles = [shapefile for shapefile in os.listdir(shapefiles) if shapefile[-3:] == "shp"]
        layers = {
            s: gdal.DataSource(os.path.join(self.serializer.path_directory, s))[0] for s in shapefiles
        }
        return layers


class MushroomShapefileSerializerTest(CommonShapefileSerializerMixin, TestCase):
    def setUp(self):
        self.point1 = MushroomSpot.objects.create(serialized='SRID=%s;POINT(0 0)' % settings.SRID)
        self.point1.tags.add(Tag.objects.create(label="Tag1"))
        self.point1.tags.add(Tag.objects.create(label="Tag2"))
        self.line1 = MushroomSpot.objects.create(serialized='SRID=%s;LINESTRING(0 0, 10 0)' % settings.SRID)
        self.multipoint = MushroomSpot.objects.create(serialized='SRID=%s;MULTIPOINT((1 1), (2 2))' % settings.SRID)
        self.multiline = MushroomSpot.objects.create(serialized='SRID=%s;MULTILINESTRING((1 1, 2 2), '
                                                                '(3 3, 4 4))' % settings.SRID)
        self.polygon = MushroomSpot.objects.create(serialized='SRID=%s;POLYGON((1 1, 2 2, '
                                                              '1 2, 1 1))' % settings.SRID)
        self.multipolygon = MushroomSpot.objects.create(serialized='SRID=%s;MULTIPOLYGON(((1 1, 2 2, '
                                                                   '1 2, 1 1)))' % settings.SRID)
        self.geometrycollection = MushroomSpot.objects.create(
            serialized='SRID=%s;GEOMETRYCOLLECTION(POINT(0 0), POLYGON((1 1, 2 2, 1 2, 1 1))))' % settings.SRID)
        MushroomSpot.geomfield = GeometryField(name='geom', srid=settings.SRID)

        self.serializer = ZipShapeSerializer()
        response = HttpResponse()
        self.serializer.serialize(MushroomSpot.objects.all(), stream=response,
                                  fields=['id', 'name', 'number', 'size', 'boolean', 'tags'], delete=False)

    def test_serializer_no_geom(self):
        response = HttpResponse()
        MushroomSpot.objects.create()
        self.serializer.serialize(MushroomSpot.objects.all(), stream=response,
                                  fields=['id', 'name', 'number', 'size', 'boolean', 'tags'], delete=False)
        layers = self.getShapefileLayers()
        self.assertEqual(len(layers['Point.shp']), 1)
        self.assertEqual(len(layers['LineString.shp']), 1)
        self.assertEqual(len(layers['Polygon.shp']), 1)
        self.assertEqual(len(layers['MultiPoint.shp']), 2)
        self.assertEqual(len(layers['MultiLineString.shp']), 1)
        self.assertEqual(len(layers['MultiPolygon.shp']), 2)

    def test_serializer_creates_one_layer_per_type(self):
        self.assertEqual(len(self.getShapefileLayers()), 6)

    def test_each_layer_has_records_by_type(self):
        layers = self.getShapefileLayers()
        self.assertEqual(len(layers['Point.shp']), 1)
        self.assertEqual(len(layers['LineString.shp']), 1)
        self.assertEqual(len(layers['Polygon.shp']), 1)
        self.assertEqual(len(layers['MultiPoint.shp']), 2)
        self.assertEqual(len(layers['MultiLineString.shp']), 1)
        self.assertEqual(len(layers['MultiPolygon.shp']), 2)

    def test_each_layer_has_a_different_geometry_type(self):
        layer_types = [layer.geom_type.name for layer in self.getShapefileLayers().values()]

        self.assertCountEqual(layer_types, ['Polygon', 'LineString', 'LineString', 'Point', 'MultiPoint', 'Polygon'])

    def test_layer_has_right_projection(self):
        for layer in self.getShapefileLayers().values():
            self.assertIn(layer.srs.name, ('RGF_1993_Lambert_93', 'RGF93_Lambert_93', 'RGF93 / Lambert-93'))
            self.assertCountEqual(layer.fields, ['id', 'name', 'number', 'size', 'boolean', 'tags'])

    def test_geometries_come_from_records(self):
        layers = self.getShapefileLayers().values()
        geom_type_layer = {layer.name: layer for layer in layers}
        feature = geom_type_layer['Point'][0]
        self.assertEqual(str(feature['id']), str(self.point1.pk))
        self.assertTrue(feature.geom.geos.equals(self.point1.geom))

        feature = geom_type_layer['MultiPoint'][0]
        self.assertEqual(str(feature['id']), str(self.multipoint.pk))
        self.assertTrue(feature.geom.geos.equals(self.multipoint.geom))

        feature = geom_type_layer['LineString'][0]
        self.assertEqual(str(feature['id']), str(self.line1.pk))
        self.assertTrue(feature.geom.geos.equals(self.line1.geom))

        feature = geom_type_layer['MultiLineString'][0]
        self.assertEqual(str(feature['id']), str(self.multiline.pk))
        self.assertTrue(feature.geom.geos.equals(self.multiline.geom))

        feature = geom_type_layer['Polygon'][0]
        self.assertEqual(str(feature['id']), str(self.polygon.pk))
        self.assertTrue(feature.geom.geos.equals(self.polygon.geom))

        feature = geom_type_layer['MultiPolygon'][0]
        self.assertEqual(str(feature['id']), str(self.multipolygon.pk))
        self.assertTrue(feature.geom.geos.equals(self.multipolygon.geom))

    def test_attributes(self):
        l_point = self.getShapefileLayers()['Point.shp']
        feature = l_point[0]
        self.assertEqual(feature['name'].value, self.point1.name)


class NoGeomShapefileSerializerTest(CommonShapefileSerializerMixin, TestCase):
    def setUp(self):
        self.market = Tag.objects.create(label="Label")

    def test_multiple_geoms(self):
        self.serializer = ZipShapeSerializer()
        response = HttpResponse()
        with self.assertRaisesRegex(ValueError, 'No geodjango geometry fields found in this model'):
            self.serializer.serialize(Tag.objects.all(), stream=response,
                                      fields=['id', 'label'], delete=False)


class SupermarketShapefileSerializerTest(CommonShapefileSerializerMixin, TestCase):
    def setUp(self):
        self.market = Supermarket.objects.create(geom='SRID=%s;POLYGON((1 1, 2 2, 1 2, 1 1))' % settings.SRID,
                                                 parking='SRID=%s;POINT(0 0)' % settings.SRID)

    def test_multiple_geoms_wrong_geom_field(self):
        class MockedDict(dict):
            def __getitem__(self, key):
                if key == "GEOM_FIELD_NAME":
                    return "other_geom"
                return app_settings[key]
        self.serializer = ZipShapeSerializer()
        response = HttpResponse()
        with self.assertRaisesRegex(ValueError, "Geodjango geometry field not found with the name 'other_geom', "
                                                "fields available are: 'geom, parking'"):
            with patch('mapentity.serializers.shapefile.app_settings') as mock:
                mock.__getitem__.side_effect = MockedDict().__getitem__
                self.serializer.serialize(Supermarket.objects.all(), stream=response,
                                          fields=['id'], delete=False)

    def test_multiple_geoms_no_geom_field(self):
        class MockedDict(dict):
            def __getitem__(self, key):
                if key == "GEOM_FIELD_NAME":
                    return
                return app_settings[key]
        self.serializer = ZipShapeSerializer()
        response = HttpResponse()
        with self.assertRaisesRegex(ValueError, "More than one geodjango geometry field found, please specify "
                                                "which to use by name using the 'geo_field' keyword. "
                                                "Available fields are: 'geom, parking'"):
            with patch('mapentity.serializers.shapefile.app_settings') as mock:
                mock.__getitem__.side_effect = MockedDict().__getitem__
                self.serializer.serialize(Supermarket.objects.all(), stream=response,
                                          fields=['id'], delete=False)

    def test_multiple_geoms(self):
        self.serializer = ZipShapeSerializer()
        response = HttpResponse()
        self.serializer.serialize(Supermarket.objects.all(), stream=response,
                                  fields=['id'], delete=False)
        layers = self.getShapefileLayers()
        layer = layers[0]
        self.assertEqual(layer.name, 'Polygon')

        self.serializer = ZipShapeSerializer()
        Supermarket.geomfield = GeometryField(name='parking', srid=settings.SRID)
        self.serializer.serialize(Supermarket.objects.all(), stream=response,
                                  fields=['id'], delete=False)
        layers = self.getShapefileLayers()
        delattr(Supermarket, 'geomfield')
        layer = layers[0]
        self.assertEqual(layer.name, 'Point')

    def test_serializer_foreign_key(self):
        self.serializer = ZipShapeSerializer()
        response = HttpResponse()
        self.serializer.serialize(Supermarket.objects.all(), stream=response,
                                  fields=['id', 'tag'], delete=False)
        layers = self.getShapefileLayers()
        layer = layers[0]
        feature = layer[0]
        if VERSION[0] >= 3:
            self.assertEqual(feature['tag'].value, None)
        else:
            self.assertEqual(feature['tag'].value, "")

        self.serializer = ZipShapeSerializer()
        tag = Tag.objects.create(label="Tag")
        Supermarket.objects.update(tag=tag)
        self.serializer.serialize(Supermarket.objects.all(), stream=response,
                                  fields=['id', 'tag'], delete=False)
        layers = self.getShapefileLayers()
        layer = layers[0]
        feature = layer[0]
        self.assertEqual(feature['tag'].value, "Tag")


class CSVSerializerTests(TestCase):
    def setUp(self):
        self.point = MushroomSpot.objects.create()
        self.point.tags.add(Tag.objects.create(label="Tag1"))
        self.point.tags.add(Tag.objects.create(label="Tag2"))
        self.serializer = CSVSerializer()
        self.stream = StringIO()

    def tearDown(self):
        self.stream.close()

    def test_content(self):
        self.serializer.serialize(MushroomSpot.objects.all(), stream=self.stream,
                                  fields=['id', 'name', 'number', 'size', 'boolean', 'tags'], delete=False)
        self.assertEquals(self.stream.getvalue(),
                          ('ID,name,number,size,boolean,tags\r\n{},'
                           'Empty,42,3.14159,yes,"Tag1,Tag2"\r\n').format(self.point.pk))

    @override_settings(USE_L10N=True)
    def test_content_fr(self):
        translation.activate('fr-fr')
        self.serializer.serialize(MushroomSpot.objects.all(), stream=self.stream,
                                  fields=['id', 'name', 'number', 'size', 'boolean', 'tags'], delete=False)
        self.assertEquals(self.stream.getvalue(),
                          ('ID,name,number,size,boolean,tags\r\n{},'
                           'Empty,42,"3,14159",oui,"Tag1,Tag2"\r\n').format(self.point.pk))
        translation.deactivate()
