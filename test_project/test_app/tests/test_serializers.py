import os
from io import StringIO
from unittest.mock import patch

from django.conf import settings
from django.contrib.gis import gdal
from django.contrib.gis.db.models import GeometryField
from django.http import HttpResponse
from django.test import TestCase
from django.test.utils import override_settings
from django.utils import translation

from mapentity.registry import app_settings
from mapentity.serializers import CSVSerializer, ZipShapeSerializer
from mapentity.serializers.datatables import MapentityDatatableSerializer
from mapentity.serializers.fields import CommaSeparatedRelatedField
from test_project.test_app.models import (
    DummyModel,
    ManikinModel,
    MushroomSpot,
    Supermarket,
    Tag,
)


class CommonShapefileSerializerMixin:
    def getShapefileLayers(self):
        shapefiles = self.serializer.path_directory
        shapefiles = [
            shapefile for shapefile in os.listdir(shapefiles) if shapefile[-3:] == "shp"
        ]
        layers = {
            s: gdal.DataSource(os.path.join(self.serializer.path_directory, s))[0]
            for s in shapefiles
        }
        return layers


class MushroomShapefileSerializerTest(CommonShapefileSerializerMixin, TestCase):
    def setUp(self):
        self.point1 = MushroomSpot.objects.create(
            serialized=f"SRID={settings.SRID};POINT(0 0)"
        )
        self.point1.tags.add(Tag.objects.create(label="Tag1"))
        self.point1.tags.add(Tag.objects.create(label="Tag2"))
        self.line1 = MushroomSpot.objects.create(
            serialized=f"SRID={settings.SRID};LINESTRING(0 0, 10 0)"
        )
        self.multipoint = MushroomSpot.objects.create(
            serialized=f"SRID={settings.SRID};MULTIPOINT((1 1), (2 2))"
        )
        self.multiline = MushroomSpot.objects.create(
            serialized=f"SRID={settings.SRID};MULTILINESTRING((1 1, 2 2), (3 3, 4 4))"
        )
        self.polygon = MushroomSpot.objects.create(
            serialized=f"SRID={settings.SRID};POLYGON((1 1, 2 2, 1 2, 1 1))"
        )
        self.multipolygon = MushroomSpot.objects.create(
            serialized=f"SRID={settings.SRID};MULTIPOLYGON(((1 1, 2 2, 1 2, 1 1)))"
        )
        self.geometrycollection = MushroomSpot.objects.create(
            serialized=f"SRID={settings.SRID};GEOMETRYCOLLECTION(POINT(0 0), POLYGON((1 1, 2 2, 1 2, 1 1))))"
        )
        MushroomSpot.geomfield = GeometryField(name="geom", srid=settings.SRID)

        self.serializer = ZipShapeSerializer()
        response = HttpResponse()
        self.serializer.serialize(
            MushroomSpot.objects.all(),
            stream=response,
            fields=["id", "name", "number", "size", "boolean", "tags"],
            delete=False,
        )

    def test_serializer_no_geom(self):
        response = HttpResponse()
        MushroomSpot.objects.create()
        self.serializer.serialize(
            MushroomSpot.objects.all(),
            stream=response,
            fields=["id", "name", "number", "size", "boolean", "tags"],
            delete=False,
        )
        layers = self.getShapefileLayers()
        self.assertEqual(len(layers["Point.shp"]), 1)
        self.assertEqual(len(layers["LineString.shp"]), 1)
        self.assertEqual(len(layers["Polygon.shp"]), 1)
        self.assertEqual(len(layers["MultiPoint.shp"]), 2)
        self.assertEqual(len(layers["MultiLineString.shp"]), 1)
        self.assertEqual(len(layers["MultiPolygon.shp"]), 2)

    def test_serializer_creates_one_layer_per_type(self):
        self.assertEqual(len(self.getShapefileLayers()), 6)

    def test_each_layer_has_records_by_type(self):
        layers = self.getShapefileLayers()
        self.assertEqual(len(layers["Point.shp"]), 1)
        self.assertEqual(len(layers["LineString.shp"]), 1)
        self.assertEqual(len(layers["Polygon.shp"]), 1)
        self.assertEqual(len(layers["MultiPoint.shp"]), 2)
        self.assertEqual(len(layers["MultiLineString.shp"]), 1)
        self.assertEqual(len(layers["MultiPolygon.shp"]), 2)

    def test_each_layer_has_a_different_geometry_type(self):
        layer_types = [
            layer.geom_type.name for layer in self.getShapefileLayers().values()
        ]

        self.assertCountEqual(
            layer_types,
            ["Polygon", "LineString", "LineString", "Point", "MultiPoint", "Polygon"],
        )

    def test_layer_has_right_projection(self):
        for layer in self.getShapefileLayers().values():
            self.assertEqual(layer.srs.srid, 4326)
            self.assertCountEqual(
                layer.fields, ["id", "name", "number", "size", "boolean", "tags"]
            )

    def test_geometries_come_from_records(self):
        layers = self.getShapefileLayers().values()
        geom_type_layer = {layer.name: layer for layer in layers}
        feature = geom_type_layer["Point"][0]
        self.assertEqual(str(feature["id"]), str(self.point1.pk))
        self.assertTrue(feature.geom.geos.equals(self.point1.geom))

        feature = geom_type_layer["MultiPoint"][0]
        self.assertEqual(str(feature["id"]), str(self.multipoint.pk))
        self.assertTrue(feature.geom.geos.equals(self.multipoint.geom))

        feature = geom_type_layer["LineString"][0]
        self.assertEqual(str(feature["id"]), str(self.line1.pk))
        self.assertTrue(feature.geom.geos.equals(self.line1.geom))

        feature = geom_type_layer["MultiLineString"][0]
        self.assertEqual(str(feature["id"]), str(self.multiline.pk))
        self.assertTrue(feature.geom.geos.equals(self.multiline.geom))

        feature = geom_type_layer["Polygon"][0]
        self.assertEqual(str(feature["id"]), str(self.polygon.pk))
        self.assertTrue(feature.geom.geos.equals(self.polygon.geom))

        feature = geom_type_layer["MultiPolygon"][0]
        self.assertEqual(str(feature["id"]), str(self.multipolygon.pk))
        self.assertTrue(feature.geom.geos.equals(self.multipolygon.geom))

    def test_attributes(self):
        l_point = self.getShapefileLayers()["Point.shp"]
        feature = l_point[0]
        self.assertEqual(feature["name"].value, self.point1.name)


class NoGeomShapefileSerializerTest(CommonShapefileSerializerMixin, TestCase):
    def setUp(self):
        self.market = Tag.objects.create(label="Label")

    def test_multiple_geoms(self):
        self.serializer = ZipShapeSerializer()
        response = HttpResponse()
        with self.assertRaisesRegex(
            ValueError, "No geodjango geometry fields found in this model"
        ):
            self.serializer.serialize(
                Tag.objects.all(), stream=response, fields=["id", "label"], delete=False
            )


class SupermarketShapefileSerializerTest(CommonShapefileSerializerMixin, TestCase):
    def setUp(self):
        self.market = Supermarket.objects.create(
            geom=f"SRID={settings.SRID};POLYGON((1 1, 2 2, 1 2, 1 1))",
            parking=f"SRID={settings.SRID};POINT(0 0)",
        )

    def test_multiple_geoms_wrong_geom_field(self):
        class MockedDict(dict):
            def __getitem__(self, key):
                if key == "GEOM_FIELD_NAME":
                    return "other_geom"
                return app_settings[key]

        self.serializer = ZipShapeSerializer()
        response = HttpResponse()
        with self.assertRaisesRegex(
            ValueError,
            "Geodjango geometry field not found with the name 'other_geom', "
            "fields available are: 'geom, parking'",
        ):
            with patch("mapentity.serializers.shapefile.app_settings") as mock:
                mock.__getitem__.side_effect = MockedDict().__getitem__
                self.serializer.serialize(
                    Supermarket.objects.all(),
                    stream=response,
                    fields=["id"],
                    delete=False,
                )

    def test_multiple_geoms_no_geom_field(self):
        class MockedDict(dict):
            def __getitem__(self, key):
                if key == "GEOM_FIELD_NAME":
                    return
                return app_settings[key]

        self.serializer = ZipShapeSerializer()
        response = HttpResponse()
        with self.assertRaisesRegex(
            ValueError,
            "More than one geodjango geometry field found, please specify "
            "which to use by name using the 'geo_field' keyword. "
            "Available fields are: 'geom, parking'",
        ):
            with patch("mapentity.serializers.shapefile.app_settings") as mock:
                mock.__getitem__.side_effect = MockedDict().__getitem__
                self.serializer.serialize(
                    Supermarket.objects.all(),
                    stream=response,
                    fields=["id"],
                    delete=False,
                )

    def test_multiple_geoms(self):
        self.serializer = ZipShapeSerializer()
        response = HttpResponse()
        self.serializer.serialize(
            Supermarket.objects.all(), stream=response, fields=["id"], delete=False
        )
        layers = self.getShapefileLayers()
        self.assertIn("Polygon.shp", layers)

        self.serializer = ZipShapeSerializer()
        Supermarket.geomfield = GeometryField(name="parking", srid=settings.SRID)
        self.serializer.serialize(
            Supermarket.objects.all(), stream=response, fields=["id"], delete=False
        )
        layers = self.getShapefileLayers()
        delattr(Supermarket, "geomfield")
        self.assertIn("Point.shp", layers)

    def test_serializer_foreign_key(self):
        self.serializer = ZipShapeSerializer()
        response = HttpResponse()
        self.serializer.serialize(
            Supermarket.objects.all(),
            stream=response,
            fields=["id", "tag"],
            delete=False,
        )
        layers = self.getShapefileLayers()
        layer = layers["Polygon.shp"]
        feature = layer[0]
        self.assertEqual(feature["tag"].value, None)

        self.serializer = ZipShapeSerializer()
        tag = Tag.objects.create(label="Tag")
        Supermarket.objects.update(tag=tag)
        self.serializer.serialize(
            Supermarket.objects.all(),
            stream=response,
            fields=["id", "tag"],
            delete=False,
        )
        layers = self.getShapefileLayers()
        layer = layers["Polygon.shp"]
        feature = layer[0]
        self.assertEqual(feature["tag"].value, "Tag")


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
        self.serializer.serialize(
            MushroomSpot.objects.all(),
            stream=self.stream,
            fields=["id", "name", "number", "size", "boolean", "tags"],
            delete=False,
        )
        self.assertEqual(
            self.stream.getvalue(),
            (
                f"ID,name,number,size,boolean,tags\r\n{self.point.pk},"
                'Empty,42,3.14159,yes,"Tag1,Tag2"\r\n'
            ),
        )

    @override_settings(USE_L10N=True)
    def test_content_fr(self):
        with translation.override("fr"):
            self.serializer.serialize(
                MushroomSpot.objects.all(),
                stream=self.stream,
                fields=["id", "name", "number", "size", "boolean", "tags"],
                delete=False,
            )
            self.assertEqual(
                self.stream.getvalue(),
                (
                    f"ID,name,number,size,boolean,tags\r\n{self.point.pk},"
                    'Empty,42,"3,14159",oui,"Tag1,Tag2"\r\n'
                ),
            )


class DatatableSerializerTests(TestCase):
    """Test MapentityDatatableSerializer for related field handling"""

    def setUp(self):
        # Create test data
        self.tag1 = Tag.objects.create(label="Tag1")
        self.tag2 = Tag.objects.create(label="Tag2")
        self.tag3 = Tag.objects.create(label="Tag3")

        self.dummy1 = DummyModel.objects.create(name="Dummy1")
        self.dummy1.tags.add(self.tag1, self.tag2)

        self.dummy2 = DummyModel.objects.create(name="Dummy2")
        self.dummy2.tags.add(self.tag3)

        self.dummy3 = DummyModel.objects.create(name="Dummy3")
        # dummy3 has no tags

        self.manikin1 = ManikinModel.objects.create(dummy=self.dummy1)
        self.manikin2 = ManikinModel.objects.create(dummy=self.dummy2)
        self.manikin3 = ManikinModel.objects.create(dummy=None)

    def test_manytomany_with_multiple_items(self):
        """Test ManyToMany field with multiple related objects"""

        class DummySerializer(MapentityDatatableSerializer):
            class Meta:
                model = DummyModel
                fields = ["id", "name", "tags"]

        serializer = DummySerializer(self.dummy1)
        data = serializer.data

        self.assertEqual(data["name"], "Dummy1")
        self.assertEqual(data["tags"], "Tag1, Tag2")

    def test_manytomany_with_single_item(self):
        """Test ManyToMany field with single related object"""

        class DummySerializer(MapentityDatatableSerializer):
            class Meta:
                model = DummyModel
                fields = ["id", "name", "tags"]

        serializer = DummySerializer(self.dummy2)
        data = serializer.data

        self.assertEqual(data["name"], "Dummy2")
        self.assertEqual(data["tags"], "Tag3")

    def test_manytomany_with_no_items(self):
        """Test ManyToMany field with no related objects"""

        class DummySerializer(MapentityDatatableSerializer):
            class Meta:
                model = DummyModel
                fields = ["id", "name", "tags"]

        serializer = DummySerializer(self.dummy3)
        data = serializer.data

        self.assertEqual(data["name"], "Dummy3")
        self.assertEqual(data["tags"], "")

    def test_foreignkey_with_related_object(self):
        """Test ForeignKey field displays string representation"""

        class ManikinSerializer(MapentityDatatableSerializer):
            class Meta:
                model = ManikinModel
                fields = ["id", "dummy"]

        serializer = ManikinSerializer(self.manikin1)
        data = serializer.data

        # Should use __str__ of dummy which returns "name (pk)"
        self.assertEqual(data["dummy"], f"Dummy1 ({self.dummy1.pk})")

    def test_foreignkey_with_null_value(self):
        """Test ForeignKey field with null value"""

        class ManikinSerializer(MapentityDatatableSerializer):
            class Meta:
                model = ManikinModel
                fields = ["id", "dummy"]

        serializer = ManikinSerializer(self.manikin3)
        data = serializer.data

        self.assertIsNone(data["dummy"])

    def test_manytomany_queryset_serialization(self):
        """Test serializing queryset with ManyToMany fields"""

        class DummySerializer(MapentityDatatableSerializer):
            class Meta:
                model = DummyModel
                fields = ["id", "name", "tags"]

        serializer = DummySerializer(
            DummyModel.objects.all().order_by("id"), many=True
        )
        data = serializer.data

        self.assertEqual(len(data), 3)
        self.assertEqual(data[0]["tags"], "Tag1, Tag2")
        self.assertEqual(data[1]["tags"], "Tag3")
        self.assertEqual(data[2]["tags"], "")

    def test_foreignkey_queryset_serialization(self):
        """Test serializing queryset with ForeignKey fields"""

        class ManikinSerializer(MapentityDatatableSerializer):
            class Meta:
                model = ManikinModel
                fields = ["id", "dummy"]

        serializer = ManikinSerializer(
            ManikinModel.objects.all().order_by("id"), many=True
        )
        data = serializer.data

        self.assertEqual(len(data), 3)
        self.assertEqual(data[0]["dummy"], f"Dummy1 ({self.dummy1.pk})")
        self.assertEqual(data[1]["dummy"], f"Dummy2 ({self.dummy2.pk})")
        self.assertIsNone(data[2]["dummy"])


class CommaSeparatedRelatedFieldTests(TestCase):
    """Test CommaSeparatedRelatedField directly"""

    def setUp(self):
        self.tag1 = Tag.objects.create(label="Alpha")
        self.tag2 = Tag.objects.create(label="Beta")
        self.tag3 = Tag.objects.create(label="Gamma")

    def test_to_representation_multiple_items(self):
        """Test representation with multiple items"""
        dummy = DummyModel.objects.create(name="Test")
        dummy.tags.add(self.tag1, self.tag2, self.tag3)

        field = CommaSeparatedRelatedField(read_only=True)
        result = field.to_representation(dummy.tags)

        self.assertEqual(result, "Alpha, Beta, Gamma")

    def test_to_representation_single_item(self):
        """Test representation with single item"""
        dummy = DummyModel.objects.create(name="Test")
        dummy.tags.add(self.tag1)

        field = CommaSeparatedRelatedField(read_only=True)
        result = field.to_representation(dummy.tags)

        self.assertEqual(result, "Alpha")

    def test_to_representation_empty(self):
        """Test representation with no items"""
        dummy = DummyModel.objects.create(name="Test")

        field = CommaSeparatedRelatedField(read_only=True)
        result = field.to_representation(dummy.tags)

        self.assertEqual(result, "")

