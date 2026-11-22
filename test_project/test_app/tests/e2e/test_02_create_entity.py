import time

from playwright.sync_api import expect

from .base import PlaywrightE2ETestCase


class DummyModelCreateE2ETest(PlaywrightE2ETestCase):
    create_default_data = False

    def setUp(self):
        super().setUp()
        self.login()
        self.mock_tiles()
        self.visit("/dummymodel/add/")

    def test_should_display_the_create_form(self):
        expect(self.page.locator("form").first).to_be_attached()

    def test_should_have_map_container_for_geometry_input(self):
        expect(
            self.page.locator('.maplibre-map, #mainmap, .map-panel, [id*="map"]').first
        ).to_be_attached()

    def test_should_have_draw_marker_button(self):
        expect(self.page.locator("#id_geom_draw_marker")).to_be_attached()

    def test_should_show_validation_error_when_submitting_without_geometry(self):
        self.page.locator('input[name="name_en"]').fill("Test Entity Without Geom")
        self.set_tinymce_content("id_short_description", "Test short description")
        self.set_tinymce_content("id_description", "Test description")

        with self.page.expect_response(
            lambda r: "/dummymodel/add/" in r.url and r.request.method == "POST"
        ):
            self.page.locator("#save_changes").click()
        self.page.wait_for_load_state("domcontentloaded")
        self.assertIn("/dummymodel/add/", self.page.url)

    def test_should_create_entity_successfully_with_all_required_fields_and_geometry(
        self,
    ):
        entity_name = f"Test Entity {int(time.time() * 1000)}"

        self.page.locator('input[name="name_en"]').fill(entity_name)
        self.set_tinymce_content("id_short_description", "Test short description")
        self.set_tinymce_content("id_description", "Test description")

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
            lambda url: "/dummymodel/" in url and "/add/" not in url,
            timeout=15000,
        )
        expect(self.page.get_by_text(entity_name).first).to_be_attached()
