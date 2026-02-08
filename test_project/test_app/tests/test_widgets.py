from django.contrib.gis.geos import Point
from django.test import TestCase

from mapentity.widgets import HiddenGeometryWidget, MapWidget, SelectMultipleWithPop


class HiddenGeometryWidgetTestCase(TestCase):
    def test_widget_transform_if_srid(self):
        """Widget should transform geometry to API_SRID if geos object provided"""
        widget = HiddenGeometryWidget()
        geom = Point(0, 0, srid=2154)
        output = widget.render("geometry", geom)
        geom.transform(4326)
        self.assertEqual(
            output, f'<input type="hidden" name="geometry" value="{geom.ewkt}">'
        )


class MapWidgetTestCase(TestCase):
    def test_serialize_none(self):
        widget = MapWidget()
        self.assertEqual(widget.serialize(None), "")

    def test_serialize_empty_string(self):
        widget = MapWidget()
        self.assertEqual(widget.serialize(""), "")

    def test_serialize_point(self):
        widget = MapWidget()
        geom = Point(2.0, 48.0, srid=4326)
        result = widget.serialize(geom)
        self.assertIn('"type": "Point"', result)
        self.assertIn("2.0", result)

    def test_serialize_transforms_srid(self):
        """serialize should transform geometry to API_SRID"""
        widget = MapWidget()
        geom = Point(700000, 6600000, srid=2154)
        result = widget.serialize(geom)
        # Should be transformed to 4326 (API_SRID)
        self.assertIn('"type": "Point"', result)

    def test_serialize_no_transform(self):
        """serialize handles objects without transform attr"""
        widget = MapWidget()

        class FakeGeom:
            geojson = '{"type": "Point"}'

        self.assertEqual(widget.serialize(FakeGeom()), '{"type": "Point"}')

    def test_serialize_no_geojson(self):
        """serialize returns empty string if no geojson attr"""
        widget = MapWidget()

        class FakeGeom:
            def transform(self, srid):
                pass

            def clone(self):
                return self

        self.assertEqual(widget.serialize(FakeGeom()), "")

    def test_get_attrs_default(self):
        widget = MapWidget()
        attrs = widget._get_attrs("myfield")
        self.assertEqual(attrs["id_map"], "myfield_map")
        self.assertTrue(attrs["modifiable"])
        self.assertIsNone(attrs["target_map"])
        self.assertEqual(attrs["geom_type"], "Geometry")

    def test_get_attrs_with_geom_type(self):
        widget = MapWidget(attrs={"geom_type": "POINT"})
        attrs = widget._get_attrs("myfield")
        self.assertEqual(attrs["geom_type"], "POINT")

    def test_get_attrs_with_id(self):
        widget = MapWidget()
        attrs = widget._get_attrs("myfield", {"id": "custom-id"})
        self.assertEqual(attrs["id"], "custom_id")
        self.assertEqual(attrs["id_css"], "custom-id")
        self.assertEqual(attrs["id_map"], "custom-id_map")

    def test_get_attrs_with_target_map(self):
        widget = MapWidget()
        attrs = widget._get_attrs("myfield", {"target_map": "other_map"})
        self.assertEqual(attrs["target_map"], "other_map")

    def test_get_context_with_value(self):
        widget = MapWidget()
        geom = Point(2.0, 48.0, srid=4326)
        context = widget.get_context("myfield", geom, {"id": "id_myfield"})
        self.assertIn("serialized", context)
        self.assertIn('"type": "Point"', context["serialized"])

    def test_get_context_empty_value(self):
        widget = MapWidget()
        context = widget.get_context("myfield", "", {"id": "id_myfield"})
        self.assertEqual(context["serialized"], "")

    def test_get_context_none_value(self):
        widget = MapWidget()
        context = widget.get_context("myfield", None, {"id": "id_myfield"})
        self.assertEqual(context["serialized"], "")


class SelectMultipleWithPopTestCase(TestCase):
    def test_widget_rendering(self):
        widget = SelectMultipleWithPop(add_url="/add/")
        output = widget.render("select-multiple", value="value")
        self.assertIn('<select name="select-multiple" multiple>', output)
        self.assertIn("</select>", output)
        self.assertIn('href="/add/"', output)
        self.assertIn('id="add_id_select-multiple"', output)
        self.assertIn('onclick="return showAddAnotherPopup(this);"', output)
        self.assertIn('<i class="bi bi-plus"></i>', output)
