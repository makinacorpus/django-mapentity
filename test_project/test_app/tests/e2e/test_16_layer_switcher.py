from playwright.sync_api import expect

from .base import PlaywrightE2ETestCase


class LayerSwitcherE2ETest(PlaywrightE2ETestCase):
    create_default_data = False

    def setUp(self):
        super().setUp()
        self.login()
        self.mock_tiles()
        self.visit("/dummymodel/list/")
        expect(
            self.page.locator("#mainmap, .maplibre-map, .map-panel").first
        ).to_be_attached(timeout=15000)

    def test_should_change_base_layer_via_layer_switcher(self):
        self.page.locator(".layer-switcher-btn").click()
        expect(self.page.locator(".layer-switcher-menu")).to_be_visible()

        radios = self.page.locator('.layer-switcher-menu input[type="radio"]')
        radios.nth(1).wait_for(state="attached", timeout=10000)
        self.assertGreater(radios.count(), 1)
        expect(radios.first).to_be_checked()

    def test_should_activate_an_overlay_via_layer_switcher(self):
        self.page.locator(".layer-switcher-btn").click()
        expect(self.page.locator(".layer-switcher-menu")).to_be_visible()

        overlays = self.page.locator(
            '.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]'
        )
        overlays.nth(1).wait_for(state="attached", timeout=10000)
        self.assertGreater(overlays.count(), 1)

        expect(overlays.first).not_to_be_checked()
        overlays.first.check(force=True)
        expect(overlays.first).to_be_checked()

    def test_should_change_base_layer_and_activate_overlay_together(self):
        self.page.locator(".layer-switcher-btn").click()
        expect(self.page.locator(".layer-switcher-menu")).to_be_visible()

        radios = self.page.locator('.layer-switcher-menu input[type="radio"]')
        radios.nth(1).wait_for(state="attached", timeout=10000)
        overlays = self.page.locator(
            '.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]'
        )
        overlays.first.wait_for(state="attached", timeout=10000)

        expect(radios.first).to_be_checked()
        overlays.first.check(force=True)
        expect(overlays.first).to_be_checked()
        expect(radios.first).to_be_checked()

    def test_should_load_tiles_when_switching_base_layer(self):
        self.wait_for_tile("osm", timeout=15000)

        self.page.locator(".layer-switcher-btn").click()
        expect(self.page.locator(".layer-switcher-menu")).to_be_visible()

        radios = self.page.locator('.layer-switcher-menu input[type="radio"]')
        radios.nth(1).wait_for(state="attached", timeout=10000)
        self.assertGreater(radios.count(), 1)

        radios.nth(1).check(force=True)
        expect(radios.nth(1)).to_be_checked()

        self.wait_for_tile("otm", timeout=15000)

    def test_should_add_overlay_source_to_map_when_activating_overlay(self):
        self.page.locator(".layer-switcher-btn").click()
        expect(self.page.locator(".layer-switcher-menu")).to_be_visible()

        overlays = self.page.locator(
            '.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]'
        )
        overlays.first.wait_for(state="attached", timeout=10000)

        overlays.first.check(force=True)
        expect(overlays.first).to_be_checked()

        self.page.wait_for_function(
            """() => {
                if (!window.MapEntity || !window.MapEntity.currentMap) return false;
                const map = window.MapEntity.currentMap.map.getMap();
                const style = map.getStyle();
                if (!style || !style.sources) return false;
                const sourceNames = Object.keys(style.sources);
                return sourceNames.some(
                    name => name.includes('cadastre') || name.includes('overlay') || name.includes('ign')
                );
            }""",
            timeout=10000,
        )

    def test_should_keep_layer_switcher_menu_above_point_markers_with_custom_z_index(
        self,
    ):
        self.page.locator(".layer-switcher-btn").click()
        expect(self.page.locator(".layer-switcher-menu")).to_be_visible()

        result = self.page.evaluate(
            """() => {
                const canvasContainer = document.querySelector('.maplibregl-canvas-container');
                const menu = document.querySelector('.layer-switcher-menu');
                const isolation = window.getComputedStyle(canvasContainer).isolation;

                const marker = document.createElement('div');
                marker.className = 'maplibregl-marker';
                marker.style.zIndex = '9999';
                marker.style.width = '40px';
                marker.style.height = '40px';
                marker.style.pointerEvents = 'auto';

                const mapRect = document.querySelector('.maplibregl-map').getBoundingClientRect();
                const menuRect = menu.getBoundingClientRect();
                marker.style.left = `${menuRect.left - mapRect.left + 10}px`;
                marker.style.top = `${menuRect.top - mapRect.top + 10}px`;
                canvasContainer.appendChild(marker);

                try {
                    const topEl = document.elementFromPoint(menuRect.left + 20, menuRect.top + 20);
                    return {
                        isolation,
                        menuOnTop: menu.contains(topEl),
                    };
                } finally {
                    marker.remove();
                }
            }"""
        )
        self.assertEqual(result["isolation"], "isolate")
        self.assertTrue(result["menuOnTop"])
