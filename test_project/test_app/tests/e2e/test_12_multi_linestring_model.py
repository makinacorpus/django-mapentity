import time

from django.contrib.gis.geos import LineString, MultiLineString
from playwright.sync_api import expect

from test_project.test_shapes.models import MultiLineStringModel

from .base import PlaywrightE2ETestCase


class MultiLineStringModelCreateE2ETest(PlaywrightE2ETestCase):
    create_default_data = False

    def setUp(self):
        super().setUp()
        self.login()
        self.mock_tiles()

    def test_should_display_create_form_with_line_draw_button(self):
        self.visit("/multilinestringmodel/add/")
        expect(self.page.locator("form").first).to_be_attached()
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )

        expect(self.page.locator("#id_geom_draw_line")).to_be_attached()
        expect(self.page.locator("#id_geom_draw_marker")).not_to_be_attached()
        expect(self.page.locator("#id_geom_draw_polygon")).not_to_be_attached()

    def test_should_create_entity_with_single_line(self):
        self.visit("/multilinestringmodel/add/")
        entity_name = f"Test MultiLineString {int(time.time() * 1000)}"

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
            self.assertEqual(data["type"], "MultiLineString")
            self.assertEqual(len(data["coordinates"]), 1)

        self.assert_geom_field_value(_check)
        self.assert_geoman_features_count(1)

        self.page.locator("#save_changes").click()
        self.page.wait_for_url(
            lambda url: "/multilinestringmodel/" in url and "/add/" not in url,
            timeout=15000,
        )
        expect(self.page.get_by_text(entity_name).first).to_be_attached()

    def test_should_create_entity_with_multiple_lines(self):
        self.visit("/multilinestringmodel/add/")
        entity_name = f"Test MultiLineString {int(time.time() * 1000)}"

        self.page.locator('input[name="name"]').fill(entity_name)
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )
        self.wait_for_geoman()

        # Draw first line
        self.page.locator("#id_geom_draw_line").click()
        self.click_canvas(100, 100)
        self.click_canvas(150, 150)
        self.click_canvas(200, 200)
        self.page.locator(".maplibregl-marker").last.click(force=True)

        # Draw second line
        self.click_canvas(150, 100)
        self.click_canvas(200, 150)
        self.click_canvas(250, 200)
        self.page.locator(".maplibregl-marker").last.click(force=True)

        def _check(data):
            self.assertEqual(data["type"], "MultiLineString")
            self.assertEqual(len(data["coordinates"]), 2)

        self.assert_geom_field_value(_check)
        self.assert_geoman_features_count(2)

        self.page.locator("#save_changes").click()
        self.page.wait_for_url(
            lambda url: "/multilinestringmodel/" in url and "/add/" not in url,
            timeout=15000,
        )
        expect(self.page.get_by_text(entity_name).first).to_be_attached()


class MultiLineStringModelEditE2ETest(PlaywrightE2ETestCase):
    create_default_data = False

    def setUp(self):
        super().setUp()
        self.login()
        self.mock_tiles()
        self.entity = MultiLineStringModel.objects.create(
            name=f"Test MultiLineString Edit {int(time.time() * 1000)}",
            geom=MultiLineString(
                LineString((1.3, 43.5), (1.4, 43.6), (1.5, 43.7), srid=4326),
                srid=4326,
            ),
        )
        self.entity_id = self.entity.pk

    def test_should_add_more_lines_in_edit_mode(self):
        self.visit(f"/multilinestringmodel/edit/{self.entity_id}/")
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
            self.assertEqual(data["type"], "MultiLineString")
            self.assertEqual(len(data["coordinates"]), 2)

        self.assert_geom_field_value(_check)
        self.assert_geoman_features_count(2)

        new_name = f"Added MultiLineString {int(time.time() * 1000)}"
        self.page.locator('input[name="name"]').fill(new_name)
        self.page.locator("#save_changes").click()

        self.page.wait_for_url(
            lambda url: f"/multilinestringmodel/{self.entity_id}/" in url,
            timeout=15000,
        )
        expect(self.page.get_by_text(new_name).first).to_be_attached()

    def test_should_allow_editing_vertices_in_edit_mode(self):
        self.visit(f"/multilinestringmodel/edit/{self.entity_id}/")
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
            lambda data: self.assertEqual(data["type"], "MultiLineString")
        )

        new_name = f"Edited MultiLineString {int(time.time() * 1000)}"
        self.page.locator('input[name="name"]').fill(new_name)
        self.page.locator("#save_changes").click()

        self.page.wait_for_url(
            lambda url: f"/multilinestringmodel/{self.entity_id}/" in url,
            timeout=15000,
        )
        expect(self.page.get_by_text(new_name).first).to_be_attached()
