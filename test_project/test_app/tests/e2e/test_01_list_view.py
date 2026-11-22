import re

from playwright.sync_api import expect

from .base import PlaywrightE2ETestCase


class DummyModelListViewE2ETest(PlaywrightE2ETestCase):
    def setUp(self):
        super().setUp()
        self.login()
        self.mock_tiles()
        self.visit("/dummymodel/list/")

    def test_should_display_the_list_page(self):
        self.assertIn("/dummymodel/list", self.page.url)
        expect(self.page.locator("body")).to_be_visible()

    def test_should_have_map_container(self):
        expect(
            self.page.locator("#mainmap, .maplibre-map, .map-panel").first
        ).to_be_attached()

    def test_should_display_table_with_entities(self):
        expect(self.page.locator("table").first).to_be_attached()

    def test_should_have_add_button(self):
        expect(
            self.page.locator("a", has_text=re.compile(r"add", re.IGNORECASE)).first
        ).to_be_attached()

    def test_should_have_layer_switcher_control_on_map(self):
        expect(
            self.page.locator("#mainmap, .maplibre-map, .map-panel").first
        ).to_be_attached(timeout=15000)

        btn = self.page.locator(
            ".layer-switcher-btn, .maplibregl-ctrl-group button, .mapboxgl-ctrl-group button, "
            '[class*="layer"][class*="control"], [class*="layer"][class*="switcher"]'
        ).first
        expect(btn).to_be_attached()
        btn.click(force=True)

        menu = self.page.locator(
            '.layer-switcher-menu, [class*="layer"][class*="menu"], [class*="layer-list"]'
        ).first
        expect(menu).to_be_attached()
        items = menu.locator('label, input, [class*="layer-item"]')
        expect(items.first).to_be_attached(timeout=10000)
        self.assertGreater(items.count(), 0)

    def test_should_display_multiple_mapentity_models_in_layer_selector(self):
        expect(
            self.page.locator("#mainmap, .maplibre-map, .map-panel").first
        ).to_be_attached(timeout=15000)

        btn = self.page.locator(
            '.layer-switcher-btn, .maplibregl-ctrl-group button, [class*="layer"][class*="control"]'
        ).first
        btn.click(force=True)

        items = self.page.locator(
            '.layer-switcher-menu label, .layer-switcher-menu [class*="layer"], [class*="layer-menu"] label'
        )
        expect(items.first).to_be_attached()
        self.assertGreater(items.count(), 0)
