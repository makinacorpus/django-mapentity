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
        self.assertNotIn("target_map", attrs)
        self.assertEqual(attrs["geom_type"], "GEOMETRY")

    def test_get_attrs_with_geom_type(self):
        widget = MapWidget(attrs={"geom_type": "POINT"})
        attrs = widget._get_attrs("myfield")
        self.assertEqual(attrs["geom_type"], "POINT")

    def test_geom_type_constructor_param(self):
        widget = MapWidget(geom_type="LINESTRING")
        attrs = widget._get_attrs("myfield")
        self.assertEqual(attrs["geom_type"], "LINESTRING")

    def test_geom_type_constructor_not_overridden_by_form(self):
        """geom_type passed to constructor should not be overridden by setdefault in forms."""
        widget = MapWidget(geom_type="LINESTRING")
        # Simulate what forms.py does with setdefault
        widget.attrs.setdefault("geom_type", "GEOMETRY")
        attrs = widget._get_attrs("myfield")
        self.assertEqual(attrs["geom_type"], "LINESTRING")

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


class MapWidgetSnappingConfigTestCase(TestCase):
    def test_snapping_config_not_present_by_default(self):
        widget = MapWidget()
        attrs = widget._get_attrs("myfield")
        self.assertNotIn("snapping_config", attrs)

    def test_snapping_config_passed_via_attrs(self):
        cfg = {
            "enabled": True,
            "snapDistance": 20,
            "snapLayers": [{"id": "road", "tilejsonUrl": "/api/road/tilejson"}],
        }
        widget = MapWidget(attrs={"snapping_config": cfg})
        attrs = widget._get_attrs("myfield")
        import json

        self.assertEqual(json.loads(attrs["snapping_config"]), cfg)

    def test_snapping_config_resolved_by_widget(self):
        """MapWidget should resolve raw snapping_config layers into snapLayers."""
        cfg = {
            "enabled": True,
            "layers": ["test_app.Road"],
            "snap_distance": 20,
        }
        widget = MapWidget(attrs={"snapping_config": cfg})
        attrs = widget._get_attrs("myfield")
        import json

        resolved = json.loads(attrs["snapping_config"])
        self.assertTrue(resolved["enabled"])
        self.assertEqual(resolved["snapDistance"], 20)
        self.assertEqual(len(resolved["snapLayers"]), 1)
        self.assertEqual(resolved["snapLayers"][0]["id"], "road")

    def test_snapping_config_from_road_form(self):
        """RoadForm widget should have resolved snapping_config."""
        from test_project.test_app.forms import RoadForm

        form = RoadForm()
        widget = form.fields["geom"].widget
        cfg = widget.attrs.get("snapping_config")
        self.assertIsNotNone(cfg)
        self.assertTrue(cfg["enabled"])

    def test_snapping_config_not_present_for_dummy_model(self):
        """DummyModelForm widget should not have snapping_config."""
        from test_project.test_app.forms import DummyModelForm

        form = DummyModelForm()
        widget = form.fields["geom"].widget
        self.assertIsNone(widget.attrs.get("snapping_config"))


class SelectMultipleWithPopTestCase(TestCase):
    def test_widget_rendering(self):
        widget = SelectMultipleWithPop(add_url="/add/")
        output = widget.render("select-multiple", value="value")
        self.assertIn(
            '<select name="select-multiple" data-autocomplete-light-function="select2" data-autocomplete-light-language="en" multiple>',
            output,
        )
        self.assertIn("</select>", output)
        self.assertIn('href="/add/"', output)
        self.assertIn('id="add_id_select-multiple"', output)
        self.assertIn('onclick="return showAddAnotherPopup(this);"', output)
        self.assertIn('<i class="bi bi-plus"></i>', output)
