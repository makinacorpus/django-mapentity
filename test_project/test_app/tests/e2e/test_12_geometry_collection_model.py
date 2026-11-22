import time

from django.contrib.gis.geos import GeometryCollection, Point
from playwright.sync_api import expect

from test_project.test_shapes.models import GeometryCollectionModel

from .base import PlaywrightE2ETestCase


class GeometryCollectionModelCreateE2ETest(PlaywrightE2ETestCase):
    create_default_data = False

    def setUp(self):
        super().setUp()
        self.login()
        self.mock_tiles()

    def test_should_display_create_form_with_all_draw_buttons(self):
        self.visit("/geometrycollectionmodel/add/")
        expect(self.page.locator("form").first).to_be_attached()
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )

        expect(self.page.locator("#id_geom_draw_marker")).to_be_attached()
        expect(self.page.locator("#id_geom_draw_line")).to_be_attached()
        expect(self.page.locator("#id_geom_draw_polygon")).to_be_attached()

    def test_should_create_entity_with_mixed_geometries(self):
        self.visit("/geometrycollectionmodel/add/")
        entity_name = f"Test GeometryCollection {int(time.time() * 1000)}"

        self.page.locator('input[name="name"]').fill(entity_name)
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )
        self.wait_for_geoman()

        # Draw a point
        self.page.locator("#id_geom_draw_marker").click()
        self.click_canvas(100, 100)

        # Draw a line
        self.page.locator("#id_geom_draw_line").click()
        self.click_canvas(150, 150)
        self.click_canvas(200, 200)
        self.click_canvas(250, 250)
        self.page.locator(".maplibregl-marker").last.click(force=True)

        def _check(data):
            self.assertEqual(data["type"], "GeometryCollection")
            self.assertEqual(len(data["geometries"]), 2)

        self.assert_geom_field_value(_check)
        self.assert_geoman_features_count(2)

        self.page.locator("#save_changes").click()
        self.page.wait_for_url(
            lambda url: "/geometrycollectionmodel/" in url and "/add/" not in url,
            timeout=15000,
        )
        expect(self.page.get_by_text(entity_name).first).to_be_attached()


class GeometryCollectionModelEditE2ETest(PlaywrightE2ETestCase):
    create_default_data = False

    def setUp(self):
        super().setUp()
        self.login()
        self.mock_tiles()
        self.entity = GeometryCollectionModel.objects.create(
            name=f"Test GeometryCollection Edit {int(time.time() * 1000)}",
            geom=GeometryCollection(Point(1.4, 43.6, srid=4326), srid=4326),
        )
        self.entity_id = self.entity.pk

    def test_should_add_more_geometries_in_edit_mode(self):
        self.visit(f"/geometrycollectionmodel/edit/{self.entity_id}/")
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )
        self.wait_for_geoman()

        self.assert_geoman_features_count(1)

        expect(self.page.locator("#id_geom_draw_marker")).to_be_visible()
        expect(self.page.locator("#id_geom_draw_line")).to_be_visible()
        expect(self.page.locator("#id_geom_draw_polygon")).to_be_visible()

        self.page.locator("#id_geom_draw_line").click()
        self.click_canvas(150, 150)
        self.click_canvas(200, 200)
        self.click_canvas(250, 250)
        self.page.locator(".maplibregl-marker").last.click(force=True)

        def _check(data):
            self.assertEqual(data["type"], "GeometryCollection")
            self.assertEqual(len(data["geometries"]), 2)

        self.assert_geom_field_value(_check)
        self.assert_geoman_features_count(2)

        new_name = f"Added to GeometryCollection {int(time.time() * 1000)}"
        self.page.locator('input[name="name"]').fill(new_name)
        self.page.locator("#save_changes").click()

        self.page.wait_for_url(
            lambda url: f"/geometrycollectionmodel/{self.entity_id}/" in url,
            timeout=15000,
        )
        expect(self.page.get_by_text(new_name).first).to_be_attached()

    def test_should_add_polygon_to_existing_collection_in_edit_mode(self):
        self.visit(f"/geometrycollectionmodel/edit/{self.entity_id}/")
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )
        self.wait_for_geoman()

        self.assert_geoman_features_count(1)

        self.page.locator("#id_geom_draw_polygon").click()
        self.click_canvas(200, 100)
        self.click_canvas(200, 150)
        self.click_canvas(300, 200)
        self.page.locator(".maplibregl-marker").nth(1).click(force=True)

        def _check(data):
            self.assertEqual(data["type"], "GeometryCollection")
            self.assertEqual(len(data["geometries"]), 2)

        self.assert_geom_field_value(_check)
        self.assert_geoman_features_count(2)

        new_name = f"Added Polygon to Collection {int(time.time() * 1000)}"
        self.page.locator('input[name="name"]').fill(new_name)
        self.page.locator("#save_changes").click()

        self.page.wait_for_url(
            lambda url: f"/geometrycollectionmodel/{self.entity_id}/" in url,
            timeout=15000,
        )
        expect(self.page.get_by_text(new_name).first).to_be_attached()

    def test_should_allow_dragging_geometries_in_edit_mode(self):
        self.visit(f"/geometrycollectionmodel/edit/{self.entity_id}/")
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
            lambda data: self.assertEqual(data["type"], "GeometryCollection")
        )

        new_name = f"Dragged GeometryCollection {int(time.time() * 1000)}"
        self.page.locator('input[name="name"]').fill(new_name)
        self.page.locator("#save_changes").click()

        self.page.wait_for_url(
            lambda url: f"/geometrycollectionmodel/{self.entity_id}/" in url,
            timeout=15000,
        )
        expect(self.page.get_by_text(new_name).first).to_be_attached()
