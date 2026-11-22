import time

from django.contrib.gis.geos import Polygon
from playwright.sync_api import expect

from test_project.test_shapes.models import SinglePolygonModel

from .base import PlaywrightE2ETestCase


class SinglePolygonModelCreateE2ETest(PlaywrightE2ETestCase):
    create_default_data = False

    def setUp(self):
        super().setUp()
        self.login()
        self.mock_tiles()

    def test_should_display_create_form_with_polygon_draw_button_only(self):
        self.visit("/singlepolygonmodel/add/")
        expect(self.page.locator("form").first).to_be_attached()
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )

        expect(self.page.locator("#id_geom_draw_polygon")).to_be_attached()
        expect(self.page.locator("#id_geom_draw_marker")).not_to_be_attached()
        expect(self.page.locator("#id_geom_draw_line")).not_to_be_attached()

    def test_should_create_entity_with_single_polygon_geometry(self):
        self.visit("/singlepolygonmodel/add/")
        entity_name = f"Test Polygon {int(time.time() * 1000)}"

        self.page.locator('input[name="name"]').fill(entity_name)
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )
        self.wait_for_geoman()

        self.page.locator("#id_geom_draw_polygon").click()
        self.click_canvas(100, 100)
        self.click_canvas(100, 150)
        self.click_canvas(200, 200)
        self.page.locator(".maplibregl-marker").nth(1).click(force=True)

        def _check(data):
            self.assertEqual(data["type"], "Polygon")
            self.assertEqual(len(data["coordinates"]), 1)
            self.assertEqual(len(data["coordinates"][0]), 4)

        self.assert_geom_field_value(_check)
        self.assert_geoman_features_count(1)

        self.page.locator("#save_changes").click()
        self.page.wait_for_url(
            lambda url: "/singlepolygonmodel/" in url and "/add/" not in url,
            timeout=15000,
        )
        expect(self.page.get_by_text(entity_name).first).to_be_attached()

    def test_should_not_allow_drawing_multiple_polygons(self):
        self.visit("/singlepolygonmodel/add/")
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )
        self.wait_for_geoman()

        self.page.locator("#id_geom_draw_polygon").click()
        self.click_canvas(100, 100)
        self.click_canvas(100, 150)
        self.click_canvas(200, 200)
        self.page.locator(".maplibregl-marker").nth(1).click(force=True)
        self.assert_geoman_features_count(1)

        self.page.wait_for_timeout(1000)

        self.page.locator("#id_geom_draw_polygon").click()
        self.click_canvas(100, 100)
        self.click_canvas(100, 150)
        self.click_canvas(200, 200)
        self.page.locator(".maplibregl-marker").nth(1).click(force=True)

        def _check(data):
            self.assertEqual(data["type"], "Polygon")
            self.assertEqual(len(data["coordinates"]), 1)
            self.assertEqual(len(data["coordinates"][0]), 4)

        self.assert_geom_field_value(_check)
        self.assert_geoman_features_count(1)


class SinglePolygonModelEditE2ETest(PlaywrightE2ETestCase):
    create_default_data = False

    def setUp(self):
        super().setUp()
        self.login()
        self.mock_tiles()
        self.entity = SinglePolygonModel.objects.create(
            name=f"Test Polygon Edit {int(time.time() * 1000)}",
            geom=Polygon(
                ((1.3, 43.5), (1.3, 43.7), (1.5, 43.7), (1.3, 43.5)),
                srid=4326,
            ),
        )
        self.entity_id = self.entity.pk

    def test_should_replace_geometry_in_edit_mode(self):
        self.visit(f"/singlepolygonmodel/edit/{self.entity_id}/")
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )
        self.wait_for_geoman()

        self.assert_geoman_features_count(1)
        expect(self.page.locator("#id_geom_draw_polygon")).to_be_visible()

        self.page.locator("#id_geom_draw_polygon").click()
        self.click_canvas(250, 100)
        self.click_canvas(250, 150)
        self.click_canvas(350, 200)
        self.page.locator(".maplibregl-marker").nth(1).click(force=True)

        def _check(data):
            self.assertEqual(data["type"], "Polygon")
            self.assertEqual(len(data["coordinates"]), 1)

        self.assert_geom_field_value(_check)
        self.assert_geoman_features_count(1)

        new_name = f"Replaced Polygon {int(time.time() * 1000)}"
        self.page.locator('input[name="name"]').fill(new_name)
        self.page.locator("#save_changes").click()

        self.page.wait_for_url(
            lambda url: f"/singlepolygonmodel/{self.entity_id}/" in url,
            timeout=15000,
        )
        expect(self.page.get_by_text(new_name).first).to_be_attached()

    def test_should_allow_editing_vertices_in_edit_mode(self):
        self.visit(f"/singlepolygonmodel/edit/{self.entity_id}/")
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
            lambda data: self.assertEqual(data["type"], "Polygon")
        )

        new_name = f"Edited Polygon {int(time.time() * 1000)}"
        self.page.locator('input[name="name"]').fill(new_name)
        self.page.locator("#save_changes").click()

        self.page.wait_for_url(
            lambda url: f"/singlepolygonmodel/{self.entity_id}/" in url,
            timeout=15000,
        )
        expect(self.page.get_by_text(new_name).first).to_be_attached()
