import json
from urllib.parse import quote

from playwright.sync_api import expect

from .base import PlaywrightE2ETestCase


class _MapContextBaseMixin:
    def open_layer_switcher(self):
        self.page.locator(".layer-switcher-btn").click()
        expect(self.page.locator(".layer-switcher-menu")).to_be_visible()

    def wait_for_map_ready(self):
        expect(
            self.page.locator("#mainmap, #detailmap, .maplibre-map, .map-panel").first
        ).to_be_attached(timeout=15000)


class MapContextUrlRestorationE2ETest(_MapContextBaseMixin, PlaywrightE2ETestCase):
    def setUp(self):
        super().setUp()
        self.login()
        self.mock_tiles()

    def test_should_restore_base_layer_overlays_and_map_view_from_url_context_parameter(
        self,
    ):
        self.visit("/dummymodel/list/")
        self.wait_for_map_ready()
        self.open_layer_switcher()

        radios = self.page.locator('.layer-switcher-menu input[type="radio"]')
        radios.nth(1).wait_for(state="attached", timeout=10000)
        loaded_overlays = self.page.locator(
            '.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]'
        )
        loaded_overlays.nth(1).wait_for(state="attached", timeout=10000)
        lazy_overlays = self.page.locator(
            '.layer-switcher-menu label[data-overlay-type="lazy"] input[type="checkbox"]'
        )
        lazy_overlays.nth(1).wait_for(state="attached", timeout=10000)

        second_base_layer_name = radios.nth(1).locator("..").inner_text().strip()
        first_overlay_name = loaded_overlays.first.locator("..").inner_text().strip()
        last_additional_layer = lazy_overlays.last.locator("..").inner_text().strip()

        url_context = {
            "mapview": {"lat": 45.0, "lng": 3.0, "zoom": 10},
            "maplayers": [
                second_base_layer_name,
                first_overlay_name,
                last_additional_layer,
            ],
        }
        context_param = quote(json.dumps(url_context))

        self.visit(f"/dummymodel/list/?context={context_param}")
        self.wait_for_map_ready()
        self.open_layer_switcher()

        radios.nth(1).wait_for(state="attached", timeout=10000)
        loaded_overlays.nth(1).wait_for(state="attached", timeout=10000)

        expect(radios.first).not_to_be_checked()
        expect(radios.nth(1)).to_be_checked()
        expect(loaded_overlays.first).to_be_checked()
        expect(lazy_overlays.last).to_be_checked()

    def test_should_persist_url_context_into_localstorage_and_restore_on_subsequent_reload(
        self,
    ):
        self.visit("/dummymodel/list/")
        self.wait_for_map_ready()
        self.open_layer_switcher()

        radios = self.page.locator('.layer-switcher-menu input[type="radio"]')
        radios.nth(1).wait_for(state="attached", timeout=10000)
        loaded_overlays = self.page.locator(
            '.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]'
        )
        loaded_overlays.nth(1).wait_for(state="attached", timeout=10000)

        second_base_layer_name = radios.nth(1).locator("..").inner_text().strip()
        first_overlay_name = loaded_overlays.first.locator("..").inner_text().strip()

        url_context = {
            "mapview": {"lat": 45.0, "lng": 3.0, "zoom": 10},
            "maplayers": [second_base_layer_name, first_overlay_name],
        }
        context_param = quote(json.dumps(url_context))

        self.visit(f"/dummymodel/list/?context={context_param}")
        self.wait_for_map_ready()

        expect(radios.nth(1)).to_be_checked()

        self.page.wait_for_function(
            """(layerName) => {
                const keys = Object.keys(window.localStorage);
                const contextKey = keys.find(k => k.includes('map-context'));
                if (!contextKey) return false;
                const stored = JSON.parse(window.localStorage.getItem(contextKey));
                return stored && stored.maplayers && stored.maplayers.includes(layerName);
            }""",
            arg=second_base_layer_name,
            timeout=10000,
        )

        self.visit("/dummymodel/list/")
        self.wait_for_map_ready()
        self.open_layer_switcher()

        radios.nth(1).wait_for(state="attached", timeout=10000)
        loaded_overlays.nth(1).wait_for(state="attached", timeout=10000)

        expect(radios.nth(1)).to_be_checked()
        expect(loaded_overlays.first).to_be_checked()


class MapContextListViewE2ETest(_MapContextBaseMixin, PlaywrightE2ETestCase):
    def setUp(self):
        super().setUp()
        self.login()
        self.mock_tiles()

    def test_should_have_the_first_base_layer_selected_and_objects_layer_checked_by_default(
        self,
    ):
        self.visit("/dummymodel/list/")
        self.wait_for_map_ready()
        self.open_layer_switcher()

        radios = self.page.locator('.layer-switcher-menu input[type="radio"]')
        radios.nth(1).wait_for(state="attached", timeout=10000)
        expect(radios.first).to_be_checked()

        loaded_overlays = self.page.locator(
            '.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]'
        )
        loaded_overlays.first.wait_for(state="attached", timeout=10000)
        expect(loaded_overlays.first).not_to_be_checked()
        expect(loaded_overlays.last).to_be_checked()

    def test_should_restore_the_selected_base_layer_after_page_reload(self):
        self.visit("/mushroomspot/list/")
        self.wait_for_map_ready()
        self.open_layer_switcher()

        radios = self.page.locator('.layer-switcher-menu input[type="radio"]')
        radios.nth(1).wait_for(state="attached", timeout=10000)
        loaded_overlays = self.page.locator(
            '.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]'
        )
        loaded_overlays.first.wait_for(state="attached", timeout=10000)

        expect(radios.first).to_be_checked()
        expect(radios.nth(1)).not_to_be_checked()

        second_base_layer_name = radios.nth(1).locator("..").inner_text().strip()
        radios.nth(1).check(force=True)
        expect(radios.nth(1)).to_be_checked()
        self.wait_for_context_saved(expected_value=second_base_layer_name)

        self.page.reload()
        self.wait_for_map_ready()
        self.open_layer_switcher()

        radios.nth(1).wait_for(state="attached", timeout=10000)
        expect(radios.nth(1)).to_be_checked()

    def test_should_restore_the_activated_overlay_after_page_reload(self):
        self.visit("/dummymodel/list/")
        self.wait_for_map_ready()
        self.open_layer_switcher()

        loaded_overlays = self.page.locator(
            '.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]'
        )
        loaded_overlays.nth(1).wait_for(state="attached", timeout=10000)

        first_overlay_name = loaded_overlays.first.locator("..").inner_text().strip()
        expect(loaded_overlays.first).not_to_be_checked()
        loaded_overlays.first.check(force=True)
        expect(loaded_overlays.first).to_be_checked()

        self.wait_for_context_saved(expected_value=first_overlay_name)

        self.visit("/dummymodel/list/")
        self.wait_for_map_ready()
        self.open_layer_switcher()

        loaded_overlays.nth(1).wait_for(state="attached", timeout=10000)
        expect(loaded_overlays.first).to_be_checked()
        expect(loaded_overlays.last).to_be_checked()

    def test_should_restore_the_activated_filters_after_page_reload(self):
        self.visit("/complexmodel/list/")
        self.wait_for_map_ready()

        self.page.locator("table tbody tr").nth(1).wait_for(state="attached")

        self.page.locator("#filters-btn").click()
        expect(self.page.locator("#mainfilter.filter-form-loaded")).to_be_visible()

        self.page.locator("#id_name").first.fill("geo point")

        self.page.locator("#id_road").locator("..").locator(".select2").click()
        self.page.locator("#id_road").locator("..").locator(
            ".select2-search__field"
        ).first.fill("Road 0")
        option = self.page.locator(".select2-results__option", has_text="Road 0").first
        expect(option).to_be_visible()
        option.click()

        self.page.locator("#id_located_in").select_option(
            label=["City 1", "City 3"], force=True
        )
        self.page.locator("#filter").click()

        self.wait_for_context_saved(expected_value="geo+point")

        self.visit("/complexmodel/list/")
        self.wait_for_map_ready()
        self.page.locator("table tbody tr").first.wait_for(state="attached")

        self.page.locator("#filters-btn").click()
        expect(self.page.locator("#mainfilter.filter-form-loaded")).to_be_visible()

        expect(self.page.locator("#id_name").first).to_have_value("geo point")
        expect(
            self.page.locator("#id_road")
            .locator("..")
            .locator(".select2-selection__choice")
            .first
        ).to_contain_text("Road")
        self.page.wait_for_function(
            "() => document.querySelector('#id_located_in')?.selectedOptions?.length === 2",
            timeout=10000,
        )
        selected_vals = self.page.locator("#id_located_in").evaluate(
            "el => Array.from(el.selectedOptions).map(o => o.value)"
        )
        self.assertEqual(
            selected_vals, [str(self.cities[1].pk), str(self.cities[3].pk)]
        )


class MapContextDetailViewE2ETest(_MapContextBaseMixin, PlaywrightE2ETestCase):
    def setUp(self):
        super().setUp()
        self.login()
        self.mock_tiles()
        self.entity_id = self.dummies[0].pk

    def test_should_have_the_first_base_layer_selected_and_objects_layer_checked_by_default(
        self,
    ):
        self.visit(f"/dummymodel/{self.entity_id}/")
        self.wait_for_map_ready()
        self.open_layer_switcher()

        radios = self.page.locator('.layer-switcher-menu input[type="radio"]')
        radios.nth(1).wait_for(state="attached", timeout=10000)
        expect(radios.first).to_be_checked()

        loaded_overlays = self.page.locator(
            '.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]'
        )
        loaded_overlays.first.wait_for(state="attached", timeout=10000)
        expect(loaded_overlays.first).not_to_be_checked()
        expect(loaded_overlays.last).to_be_checked()

    def test_should_restore_the_selected_base_layer_after_page_reload(self):
        self.visit(f"/dummymodel/{self.entity_id}/")
        self.wait_for_map_ready()
        self.open_layer_switcher()

        radios = self.page.locator('.layer-switcher-menu input[type="radio"]')
        radios.nth(1).wait_for(state="attached", timeout=10000)

        expect(radios.first).to_be_checked()
        expect(radios.nth(1)).not_to_be_checked()

        second_base_layer_name = radios.nth(1).locator("..").inner_text().strip()
        radios.nth(1).check(force=True)
        expect(radios.nth(1)).to_be_checked()

        lazy_overlays = self.page.locator(
            '.layer-switcher-menu label[data-overlay-type="lazy"] input[type="checkbox"]'
        )
        lazy_overlays.last.wait_for(state="attached", timeout=10000)
        lazy_overlays.last.check(force=True)
        expect(lazy_overlays.last).to_be_checked()

        self.wait_for_context_saved(expected_value=second_base_layer_name)

        self.page.reload()
        self.wait_for_map_ready()
        self.open_layer_switcher()

        radios.nth(1).wait_for(state="attached", timeout=10000)
        expect(radios.first).not_to_be_checked()
        expect(radios.nth(1)).to_be_checked()
        expect(lazy_overlays.last).to_be_checked()

    def test_should_restore_the_activated_overlays_after_page_reload(self):
        self.visit(f"/dummymodel/{self.entity_id}/")
        self.wait_for_map_ready()
        self.open_layer_switcher()

        loaded_overlays = self.page.locator(
            '.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]'
        )
        loaded_overlays.nth(1).wait_for(state="attached", timeout=10000)

        first_overlay_name = loaded_overlays.first.locator("..").inner_text().strip()
        expect(loaded_overlays.first).not_to_be_checked()
        loaded_overlays.first.check(force=True)
        expect(loaded_overlays.first).to_be_checked()

        self.wait_for_context_saved(expected_value=first_overlay_name)

        self.visit(f"/dummymodel/{self.entity_id}/")
        self.wait_for_map_ready()
        self.open_layer_switcher()

        loaded_overlays.nth(1).wait_for(state="attached", timeout=10000)
        expect(loaded_overlays.first).to_be_checked()
        expect(loaded_overlays.last).to_be_checked()
