import time

from django.contrib.gis.geos import MultiPoint, Point
from playwright.sync_api import expect

from test_project.test_shapes.models import MultiPointModel

from .base import PlaywrightE2ETestCase


class MultiPointModelCreateE2ETest(PlaywrightE2ETestCase):
    create_default_data = False

    def setUp(self):
        super().setUp()
        self.login()
        self.mock_tiles()

    def test_should_display_create_form_with_marker_draw_button(self):
        self.visit("/multipointmodel/add/")
        expect(self.page.locator("form").first).to_be_attached()
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )

        expect(self.page.locator("#id_geom_draw_marker")).to_be_attached()
        expect(self.page.locator("#id_geom_draw_line")).not_to_be_attached()
        expect(self.page.locator("#id_geom_draw_polygon")).not_to_be_attached()

    def test_should_create_entity_with_single_point_in_multipointmodel(self):
        self.visit("/multipointmodel/add/")
        entity_name = f"Test MultiPoint Single {int(time.time() * 1000)}"

        self.page.locator('input[name="name"]').fill(entity_name)
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )
        self.wait_for_geoman()

        self.page.locator("#id_geom_draw_marker").click()
        self.click_canvas(400, 300)

        def _check(data):
            self.assertEqual(data["type"], "MultiPoint")
            self.assertEqual(len(data["coordinates"]), 1)

        self.assert_geom_field_value(_check)
        self.assert_geoman_features_count(1)

        self.page.locator("#save_changes").click()
        self.page.wait_for_url(
            lambda url: "/multipointmodel/" in url and "/add/" not in url,
            timeout=15000,
        )
        expect(self.page.get_by_text(entity_name).first).to_be_attached()

    def test_should_create_entity_with_multiple_points(self):
        self.visit("/multipointmodel/add/")
        entity_name = f"Test MultiPoint {int(time.time() * 1000)}"

        self.page.locator('input[name="name"]').fill(entity_name)
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )
        self.wait_for_geoman()

        self.page.locator("#id_geom_draw_marker").click()
        self.click_canvas(400, 300)
        self.click_canvas(300, 200)

        def _check(data):
            self.assertEqual(data["type"], "MultiPoint")
            self.assertEqual(len(data["coordinates"]), 2)

        self.assert_geom_field_value(_check)
        self.assert_geoman_features_count(2)

        self.page.locator("#save_changes").click()
        self.page.wait_for_url(
            lambda url: "/multipointmodel/" in url and "/add/" not in url,
            timeout=15000,
        )
        expect(self.page.get_by_text(entity_name).first).to_be_attached()


class MultiPointModelEditE2ETest(PlaywrightE2ETestCase):
    create_default_data = False

    def setUp(self):
        super().setUp()
        self.login()
        self.mock_tiles()
        self.entity = MultiPointModel.objects.create(
            name=f"Test MultiPoint Edit {int(time.time() * 1000)}",
            geom=MultiPoint(
                Point(1.3, 43.5, srid=4326),
                Point(1.5, 43.7, srid=4326),
                srid=4326,
            ),
        )
        self.entity_id = self.entity.pk

    def test_should_add_more_points_in_edit_mode(self):
        self.visit(f"/multipointmodel/edit/{self.entity_id}/")
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )
        self.wait_for_geoman()

        self.assert_geoman_features_count(2)
        expect(self.page.locator("#id_geom_draw_marker")).to_be_visible()

        self.page.locator("#id_geom_draw_marker").click()
        self.click_canvas(200, 200)

        def _check(data):
            self.assertEqual(data["type"], "MultiPoint")
            self.assertEqual(len(data["coordinates"]), 3)

        self.assert_geom_field_value(_check)
        self.assert_geoman_features_count(3)

        new_name = f"Added MultiPoint {int(time.time() * 1000)}"
        self.page.locator('input[name="name"]').fill(new_name)
        self.page.locator("#save_changes").click()

        self.page.wait_for_url(
            lambda url: f"/multipointmodel/{self.entity_id}/" in url,
            timeout=15000,
        )
        expect(self.page.get_by_text(new_name).first).to_be_attached()

    def test_should_allow_dragging_points_in_edit_mode(self):
        self.visit(f"/multipointmodel/edit/{self.entity_id}/")
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )
        self.wait_for_geoman()

        self.assert_geoman_features_count(2)

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
            lambda data: self.assertEqual(data["type"], "MultiPoint")
        )

        new_name = f"Dragged MultiPoint {int(time.time() * 1000)}"
        self.page.locator('input[name="name"]').fill(new_name)
        self.page.locator("#save_changes").click()

        self.page.wait_for_url(
            lambda url: f"/multipointmodel/{self.entity_id}/" in url,
            timeout=15000,
        )
        expect(self.page.get_by_text(new_name).first).to_be_attached()
