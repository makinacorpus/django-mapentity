import time

from django.contrib.gis.geos import LineString
from playwright.sync_api import expect

from test_project.test_shapes.models import SingleLineStringModel

from .base import PlaywrightE2ETestCase


class SingleLineStringModelCreateE2ETest(PlaywrightE2ETestCase):
    create_default_data = False

    def setUp(self):
        super().setUp()
        self.login()
        self.mock_tiles()

    def test_should_display_create_form_with_line_draw_button_only(self):
        self.visit("/singlelinestringmodel/add/")
        expect(self.page.locator("form").first).to_be_attached()
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )

        expect(self.page.locator("#id_geom_draw_line")).to_be_attached()
        expect(self.page.locator("#id_geom_draw_marker")).not_to_be_attached()
        expect(self.page.locator("#id_geom_draw_polygon")).not_to_be_attached()

    def test_should_create_entity_with_linestring_geometry(self):
        self.visit("/singlelinestringmodel/add/")
        entity_name = f"Test LineString {int(time.time() * 1000)}"

        self.page.locator('input[name="name"]').fill(entity_name)
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )
        self.wait_for_geoman()

        self.page.locator("#id_geom_draw_line").click()
        self.click_canvas(100, 100)
        self.click_canvas(150, 150)
        self.click_canvas(200, 200)
        self.page.locator(".maplibregl-marker").last.click(force=True)

        def _check(data):
            self.assertEqual(data["type"], "LineString")
            self.assertEqual(len(data["coordinates"]), 3)

        self.assert_geom_field_value(_check)
        self.assert_geoman_features_count(1)

        self.page.locator("#save_changes").click()
        self.page.wait_for_url(
            lambda url: "/singlelinestringmodel/" in url and "/add/" not in url,
            timeout=15000,
        )
        expect(self.page.get_by_text(entity_name).first).to_be_attached()

    def test_should_not_allow_drawing_multiple_lines(self):
        self.visit("/singlelinestringmodel/add/")
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )
        self.wait_for_geoman()

        self.page.locator("#id_geom_draw_line").click()
        self.click_canvas(100, 100)
        self.click_canvas(150, 150)
        self.click_canvas(200, 200)
        self.page.locator(".maplibregl-marker").last.click(force=True)
        self.assert_geoman_features_count(1)

        self.page.wait_for_timeout(200)

        self.page.locator("#id_geom_draw_line").click()
        self.click_canvas(100, 100)
        self.click_canvas(150, 150)
        self.click_canvas(200, 200)
        self.page.locator(".maplibregl-marker").last.click(force=True)

        def _check(data):
            self.assertEqual(data["type"], "LineString")
            self.assertEqual(len(data["coordinates"]), 3)

        self.assert_geom_field_value(_check)
        self.assert_geoman_features_count(1)


class SingleLineStringModelEditE2ETest(PlaywrightE2ETestCase):
    create_default_data = False

    def setUp(self):
        super().setUp()
        self.login()
        self.mock_tiles()
        self.entity = SingleLineStringModel.objects.create(
            name=f"Test LineString Edit {int(time.time() * 1000)}",
            geom=LineString((1.3, 43.5), (1.4, 43.6), (1.5, 43.7), srid=4326),
        )
        self.entity_id = self.entity.pk

    def test_should_replace_geometry_in_edit_mode(self):
        self.visit(f"/singlelinestringmodel/edit/{self.entity_id}/")
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )
        self.wait_for_geoman()

        self.assert_geoman_features_count(1)
        expect(self.page.locator("#id_geom_draw_line")).to_be_visible()

        self.page.locator("#id_geom_draw_line").click()
        self.click_canvas(250, 100)
        self.click_canvas(300, 150)
        self.click_canvas(350, 200)
        self.page.locator(".maplibregl-marker").last.click(force=True)

        def _check(data):
            self.assertEqual(data["type"], "LineString")
            self.assertEqual(len(data["coordinates"]), 3)

        self.assert_geom_field_value(_check)
        self.assert_geoman_features_count(1)

        new_name = f"Replaced LineString {int(time.time() * 1000)}"
        self.page.locator('input[name="name"]').fill(new_name)
        self.page.locator("#save_changes").click()

        self.page.wait_for_url(
            lambda url: f"/singlelinestringmodel/{self.entity_id}/" in url,
            timeout=15000,
        )
        expect(self.page.get_by_text(new_name).first).to_be_attached()

    def test_should_allow_editing_vertices_in_edit_mode(self):
        self.visit(f"/singlelinestringmodel/edit/{self.entity_id}/")
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )
        self.wait_for_geoman()

        self.assert_geoman_features_count(1)

        if self.page.locator("#id_edit_drag").count() > 0:
            self.page.locator("#id_edit_drag").click()
            if self.page.locator(".maplibregl-marker").count() > 0:
                self.page.locator(".maplibregl-marker").first.dispatch_event(
                    "mousedown", {"button": 0}
                )
                canvas = self.page.locator(".maplibregl-canvas").first
                canvas.dispatch_event("mousemove", {"clientX": 250, "clientY": 250})
                canvas.dispatch_event("mouseup")

        self.assert_geom_field_value(
            lambda data: self.assertEqual(data["type"], "LineString")
        )

        new_name = f"Edited LineString {int(time.time() * 1000)}"
        self.page.locator('input[name="name"]').fill(new_name)
        self.page.locator("#save_changes").click()

        self.page.wait_for_url(
            lambda url: f"/singlelinestringmodel/{self.entity_id}/" in url,
            timeout=15000,
        )
        expect(self.page.get_by_text(new_name).first).to_be_attached()
