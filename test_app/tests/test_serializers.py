import os
from StringIO import StringIO

from django.test import TransactionTestCase
from django.conf import settings
from django.contrib.gis.db.models import GeometryField
from django.contrib.gis import gdal
from django.test.utils import override_settings
from django.utils import translation

from mapentity.serializers import ZipShapeSerializer, CSVSerializer
from mapentity.serializers.shapefile import shapefile_files

from ..models import MushroomSpot


class ShapefileSerializer(TransactionTestCase):
    def setUp(self):
        self.point1 = MushroomSpot.objects.create(serialized='SRID=%s;POINT(0 0)' % settings.SRID)
        self.line1 = MushroomSpot.objects.create(serialized='SRID=%s;LINESTRING(0 0, 10 0)' % settings.SRID)
        self.multipoint = MushroomSpot.objects.create(serialized='SRID=%s;MULTIPOINT((1 1), (2 2))' % settings.SRID)

        MushroomSpot.geomfield = GeometryField(name='geom', srid=2154)

        self.serializer = ZipShapeSerializer()
        devnull = open(os.devnull, "wb")
        self.serializer.serialize(MushroomSpot.objects.all(), stream=devnull,
                                  fields=['id', 'name', 'number', 'size', 'boolean'], delete=False)

    def tearDown(self):
        for layer_file in self.serializer.layers.values():
            for subfile in shapefile_files(layer_file):
                os.remove(subfile)

    def getShapefileLayers(self):
        shapefiles = self.serializer.layers.values()
        datasources = [gdal.DataSource(s) for s in shapefiles]
        layers = [ds[0] for ds in datasources]
        return layers

    def test_serializer_creates_one_layer_per_type(self):
        self.assertEquals(len(self.serializer.layers), 3)

    def test_each_layer_has_records_by_type(self):
        layer_point, layer_multipoint, layer_linestring = self.getShapefileLayers()
        self.assertEquals(len(layer_point), 1)
        self.assertEquals(len(layer_linestring), 1)
        self.assertEquals(len(layer_multipoint), 1)

    def test_each_layer_has_a_different_geometry_type(self):
        layer_types = [l.geom_type.name for l in self.getShapefileLayers()]
        self.assertItemsEqual(layer_types, ['MultiPoint', 'Point', 'LineString'])

    def test_layer_has_right_projection(self):
        for layer in self.getShapefileLayers():
            self.assertEquals(layer.srs.name, 'RGF93_Lambert_93')
            self.assertItemsEqual(layer.fields, ['id', 'name', 'number', 'size', 'boolean'])

    def test_geometries_come_from_records(self):
        layer_point, layer_multipoint, layer_linestring = self.getShapefileLayers()
        feature = layer_point[0]
        self.assertEquals(str(feature['id']), str(self.point1.pk))
        self.assertTrue(feature.geom.geos.equals(self.point1.geom))

        feature = layer_point[0]
        self.assertEquals(str(feature['id']), str(self.point1.pk))
        self.assertTrue(feature.geom.geos.equals(self.point1.geom))

        feature = layer_point[0]
        self.assertEquals(str(feature['id']), str(self.point1.pk))
        self.assertTrue(feature.geom.geos.equals(self.point1.geom))


class CSVSerializerTests(TransactionTestCase):
    def setUp(self):
        self.point = MushroomSpot.objects.create()
        self.serializer = CSVSerializer()
        self.stream = StringIO()

    def tearDown(self):
        self.stream.close()

    def test_content(self):
        self.serializer.serialize(MushroomSpot.objects.all(), stream=self.stream,
                                  fields=['id', 'name', 'number', 'size', 'boolean'], delete=False)
        self.assertEquals(self.stream.getvalue(), 'ID,name,number,size,boolean\r\n1,Empty,42,3.14159,yes\r\n')

    @override_settings(USE_L10N=True)
    def test_content_fr(self):
        translation.activate('fr-fr')
        self.serializer.serialize(MushroomSpot.objects.all(), stream=self.stream,
                                  fields=['id', 'name', 'number', 'size', 'boolean'], delete=False)
        self.assertEquals(self.stream.getvalue(),
                          'ID,name,number,size,boolean\r\n{},Empty,42,"3,14159",oui\r\n'.format(self.point.pk))
        translation.deactivate()
