from django.contrib.gis.geos import Polygon
from playwright.sync_api import expect

from test_project.test_app.models import HiddenModel

from .base import PlaywrightE2ETestCase


class MenuHiddenModelE2ETest(PlaywrightE2ETestCase):
    create_default_data = False

    def setUp(self):
        super().setUp()
        self.login()
        self.mock_tiles()

    def test_should_not_display_hiddenmodel_in_the_sidebar_menu(self):
        self.visit("/dummymodel/list/")
        sidebar = self.page.locator("#entitylist, .navbar-nav").first
        expect(sidebar).to_be_attached()

        expect(self.page.locator('a[href*="/dummymodel/list"]').first).to_be_attached()
        expect(self.page.locator('a[href*="/hiddenmodel/list"]')).not_to_be_attached()

    def test_should_not_display_hiddenmodel_in_the_layers_list(self):
        self.visit("/dummymodel/list/")
        expect(
            self.page.locator("#mainmap, .maplibre-map, .map-panel").first
        ).to_be_attached(timeout=15000)

        self.page.locator(".layer-switcher-btn").first.click(force=True)
        menu = self.page.locator(".layer-switcher-menu").first
        expect(menu).to_be_visible()

        # Wait for layers to populate in menu
        self.page.locator(".layer-switcher-menu label").first.wait_for(
            state="attached", timeout=10000
        )
        menu_text = menu.inner_text().lower()
        self.assertNotIn("hidden model", menu_text)
        self.assertTrue(
            any(name in menu_text for name in ("dummy", "mushroom", "road", "city"))
        )

    def test_should_still_allow_accessing_hiddenmodel_list_page_directly(self):
        self.visit("/hiddenmodel/list/")
        self.assertIn("/hiddenmodel/list", self.page.url)

    def test_should_not_include_hiddenmodel_in_js_settings_layers(self):
        self.visit("/dummymodel/list/")
        layer_ids = self.page.evaluate(
            """() => {
                if (window.SETTINGS && window.SETTINGS.layers) {
                    return window.SETTINGS.layers.map(l => l.id);
                }
                return null;
            }"""
        )
        if layer_ids is not None:
            self.assertNotIn("hiddenmodel", layer_ids)
            self.assertTrue(
                any(
                    model_id in layer_ids
                    for model_id in ("dummymodel", "mushroomspot", "road", "city")
                )
            )

    def test_should_have_accessible_geojson_endpoint_for_hiddenmodel_despite_menu_false(
        self,
    ):
        response = self.page.request.get(
            self.url("/api/hiddenmodel/drf/hiddenmodels.geojson")
        )
        self.assertEqual(response.status, 200)
        body = response.json()
        self.assertEqual(body.get("type"), "FeatureCollection")
        self.assertIsInstance(body.get("features"), list)

    def test_should_have_accessible_geojson_detail_endpoint_for_hiddenmodel(self):
        poly = Polygon(
            ((1.3, 43.5), (1.3, 43.7), (1.5, 43.7), (1.3, 43.5)),
            srid=4326,
        )
        poly.transform(2154)
        hidden_obj = HiddenModel.objects.create(name="Hidden 1", geom=poly)

        list_response = self.page.request.get(
            self.url("/api/hiddenmodel/drf/hiddenmodels.geojson")
        )
        self.assertEqual(list_response.status, 200)
        list_body = list_response.json()
        self.assertGreater(len(list_body.get("features", [])), 0)

        feature = list_body["features"][0]
        hidden_id = (
            feature.get("id")
            or feature.get("properties", {}).get("id")
            or hidden_obj.pk
        )
        detail_response = self.page.request.get(
            self.url(f"/api/hiddenmodel/drf/hiddenmodels/{hidden_id}.geojson")
        )
        self.assertEqual(detail_response.status, 200)
        detail_body = detail_response.json()
        self.assertEqual(detail_body.get("type"), "Feature")
        self.assertIn("geometry", detail_body)
        self.assertIn("properties", detail_body)
