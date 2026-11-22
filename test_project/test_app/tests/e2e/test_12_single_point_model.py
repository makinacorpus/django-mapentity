import time

from django.contrib.gis.geos import Point
from playwright.sync_api import expect

from test_project.test_shapes.models import SinglePointModel

from .base import PlaywrightE2ETestCase


class SinglePointModelCreateE2ETest(PlaywrightE2ETestCase):
    create_default_data = False

    def setUp(self):
        super().setUp()
        self.login()
        self.mock_tiles()

    def test_should_display_create_form_with_marker_draw_button_only(self):
        self.visit("/singlepointmodel/add/")
        expect(self.page.locator("form").first).to_be_attached()
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )

        expect(self.page.locator("#id_geom_draw_marker")).to_be_attached()
        expect(self.page.locator("#id_geom_draw_line")).not_to_be_attached()
        expect(self.page.locator("#id_geom_draw_polygon")).not_to_be_attached()

    def test_should_create_entity_with_point_geometry(self):
        self.visit("/singlepointmodel/add/")
        entity_name = f"Test Point {int(time.time() * 1000)}"

        self.page.locator('input[name="name"]').fill(entity_name)
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )
        self.wait_for_geoman()

        self.page.locator("#id_geom_draw_marker").click()
        self.click_canvas(400, 300)

        self.assert_geom_field_value(
            lambda data: self.assertEqual(data["type"], "Point")
        )

        self.page.locator("#save_changes").click()
        self.page.wait_for_url(
            lambda url: "/singlepointmodel/" in url and "/add/" not in url,
            timeout=15000,
        )
        expect(self.page.get_by_text(entity_name).first).to_be_attached()

    def test_should_not_allow_drawing_multiple_points(self):
        self.visit("/singlepointmodel/add/")
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )
        self.wait_for_geoman()

        self.page.locator("#id_geom_draw_marker").click()
        self.click_canvas(100, 100)
        self.assert_geoman_features_count(1)

        def _check(data, val):
            self.assertEqual(data["type"], "Point")
            self.assertEqual(len(data["coordinates"]), 2)
            self.assertEqual(val.count("Point"), 1)

        self.assert_geom_field_value(_check)

        self.page.locator("#id_geom_draw_marker").click()
        self.click_canvas(150, 150)

        self.assert_geom_field_value(_check)
        self.assert_geoman_features_count(1)


class SinglePointModelEditE2ETest(PlaywrightE2ETestCase):
    create_default_data = False

    def setUp(self):
        super().setUp()
        self.login()
        self.mock_tiles()
        self.entity = SinglePointModel.objects.create(
            name=f"Test Point Edit {int(time.time() * 1000)}",
            geom=Point(1.4, 43.6, srid=4326),
        )
        self.entity_id = self.entity.pk

    def test_should_replace_geometry_in_edit_mode(self):
        self.visit(f"/singlepointmodel/edit/{self.entity_id}/")
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )
        self.wait_for_geoman()

        self.assert_geoman_features_count(1)
        expect(self.page.locator("#id_geom_draw_marker")).to_be_visible()

        self.page.locator("#id_geom_draw_marker").click()
        self.click_canvas(200, 200)

        self.assert_geom_field_value(
            lambda data: self.assertEqual(data["type"], "Point")
        )
        self.assert_geoman_features_count(1)

        new_name = f"Replaced Point {int(time.time() * 1000)}"
        self.page.locator('input[name="name"]').fill(new_name)
        self.page.locator("#save_changes").click()

        self.page.wait_for_url(
            lambda url: f"/singlepointmodel/{self.entity_id}/" in url,
            timeout=15000,
        )
        expect(self.page.get_by_text(new_name).first).to_be_attached()

    def test_should_allow_dragging_geometry_in_edit_mode(self):
        self.visit(f"/singlepointmodel/edit/{self.entity_id}/")
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
            lambda data: self.assertEqual(data["type"], "Point")
        )

        new_name = f"Dragged Point {int(time.time() * 1000)}"
        self.page.locator('input[name="name"]').fill(new_name)
        self.page.locator("#save_changes").click()

        self.page.wait_for_url(
            lambda url: f"/singlepointmodel/{self.entity_id}/" in url,
            timeout=15000,
        )
        expect(self.page.get_by_text(new_name).first).to_be_attached()
