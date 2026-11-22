import time

from playwright.sync_api import expect

from .base import PlaywrightE2ETestCase


class AllowedTypesModelE2ETest(PlaywrightE2ETestCase):
    create_default_data = False

    def setUp(self):
        super().setUp()
        self.login()
        self.mock_tiles()

    def test_should_display_create_form_with_restricted_draw_buttons_point_and_line_only(
        self,
    ):
        self.visit("/allowedtypesmodel/add/")
        expect(self.page.locator("form").first).to_be_attached()
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )

        expect(self.page.locator("#id_geom_draw_marker")).to_be_attached()
        expect(self.page.locator("#id_geom_draw_line")).to_be_attached()
        expect(self.page.locator("#id_geom_draw_polygon")).not_to_be_attached()

    def test_should_only_keep_one_geometry_on_the_map_drawing_a_line_replaces_the_point(
        self,
    ):
        self.visit("/allowedtypesmodel/add/")
        entity_name = f"Test AllowedTypes Single Geom {int(time.time() * 1000)}"

        self.page.locator('input[name="name"]').fill(entity_name)
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )
        self.wait_for_geoman()

        # 1. Draw a Point marker
        self.page.locator("#id_geom_draw_marker").click()
        self.click_canvas(400, 300)

        self.assert_geoman_features_count(1)
        self.assert_geom_field_value(
            lambda data: self.assertEqual(data["type"], "Point")
        )

        # 2. Draw a LineString
        self.page.locator("#id_geom_draw_line").click()
        self.click_canvas(100, 100)
        self.click_canvas(150, 150)
        self.click_canvas(200, 200)
        self.page.locator(".maplibregl-marker").last.click(force=True)

        # 3. Verify previous Point is deleted and we only have the LineString
        self.assert_geoman_features_count(1)

        def _check_line(data):
            self.assertEqual(data["type"], "LineString")
            self.assertEqual(len(data["coordinates"]), 3)

        self.assert_geom_field_value(_check_line)

        # 4. Save and verify entity is created successfully
        self.page.locator("#save_changes").click()
        self.page.wait_for_url(
            lambda url: "/allowedtypesmodel/" in url and "/add/" not in url,
            timeout=15000,
        )
        expect(self.page.get_by_text(entity_name).first).to_be_attached()
