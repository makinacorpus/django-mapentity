import os
from io import StringIO

from django.test import TestCase
from django.conf import settings
from django.contrib.gis.db.models import GeometryField
from django.contrib.gis import gdal
from django.http import HttpResponse
from django.test.utils import override_settings
from django.utils import translation

from mapentity.serializers import ZipShapeSerializer, CSVSerializer

from ..models import MushroomSpot, Tag


class ShapefileSerializer(TestCase):
    def setUp(self):
        self.point1 = MushroomSpot.objects.create(serialized='SRID=%s;POINT(0 0)' % settings.SRID)
        self.point1.tags.add(Tag.objects.create(label="Tag1"))
        self.point1.tags.add(Tag.objects.create(label="Tag2"))
        self.line1 = MushroomSpot.objects.create(serialized='SRID=%s;LINESTRING(0 0, 10 0)' % settings.SRID)
        self.multipoint = MushroomSpot.objects.create(serialized='SRID=%s;MULTIPOINT((1 1), (2 2))' % settings.SRID)

        MushroomSpot.geomfield = GeometryField(name='geom', srid=settings.SRID)

        self.serializer = ZipShapeSerializer()
        response = HttpResponse()
        self.serializer.serialize(MushroomSpot.objects.all(), stream=response,
                                  fields=['id', 'name', 'number', 'size', 'boolean', 'tags'], delete=False)

    def getShapefileLayers(self):
        shapefiles = self.serializer.path_directory
        shapefiles = [shapefile for shapefile in os.listdir(shapefiles) if shapefile[-3:] == "shp"]
        datasources = [gdal.DataSource(os.path.join(self.serializer.path_directory, s)) for s in shapefiles]
        layers = [ds[0] for ds in datasources]
        return layers

    def test_serializer_creates_one_layer_per_type(self):
        self.assertEqual(len(self.getShapefileLayers()), 3)

    def test_each_layer_has_records_by_type(self):
        layer_point, layer_linestring, layer_multipoint = self.getShapefileLayers()
        self.assertEqual(len(layer_point), 1)
        self.assertEqual(len(layer_linestring), 1)
        self.assertEqual(len(layer_multipoint), 1)

    def test_each_layer_has_a_different_geometry_type(self):
        layer_types = [layer.geom_type.name for layer in self.getShapefileLayers()]
        self.assertCountEqual(layer_types, ['LineString', 'Polygon'])

    def test_layer_has_right_projection(self):
        for layer in self.getShapefileLayers():
            self.assertIn(layer.srs.name, ('RGF_1993_Lambert_93', 'RGF93_Lambert_93', 'RGF93 / Lambert-93'))
            self.assertCountEqual(layer.fields, ['id', 'name', 'number', 'size', 'boolean', 'tags'])

    def test_geometries_come_from_records(self):
        layers = self.getShapefileLayers()
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

    def test_attributes(self):
        layer_point, layer_linestring, layer_multipoint = self.getShapefileLayers()
        feature = layer_point[0]
        self.assertEqual(feature['name'].value, self.point1.name)


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
