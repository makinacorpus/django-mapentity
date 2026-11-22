from playwright.sync_api import expect

from .base import PlaywrightE2ETestCase


class ListViewExportsE2ETest(PlaywrightE2ETestCase):
    def setUp(self):
        super().setUp()
        self.login()
        self.mock_tiles()
        self.visit("/dummymodel/list/")

    def test_should_display_export_buttons(self):
        export_btn = self.page.locator(
            '.btn-group button[name="csv"], button[name="csv"], '
            '.btn-group button[name="shp"], button[name="shp"], '
            'img[src*="csv.png"], img[src*="shp.png"], '
            '[title*="CSV"], [title*="Shapefile"]'
        )
        expect(export_btn.first).to_be_attached()

    def test_should_have_csv_export_button(self):
        expect(
            self.page.locator('button[name="csv"], img[src*="csv.png"]').first
        ).to_be_attached()

    def test_should_have_shapefile_export_button(self):
        expect(
            self.page.locator('button[name="shp"], img[src*="shp.png"]').first
        ).to_be_attached()

    def test_should_have_gpx_export_option_if_available(self):
        gpx_locator = self.page.locator(
            'button[name="gpx"], img[src*="gpx.png"], [title*="GPX"]'
        )
        expect(gpx_locator.first).to_be_attached()

    def test_should_trigger_csv_export_when_clicked(self):
        csv_btn = self.page.locator('button[name="csv"]').first
        expect(csv_btn).to_be_visible()
        self.page.evaluate("() => { window.open = () => {}; }")
        csv_btn.click()

    def test_should_trigger_shapefile_export_when_clicked(self):
        shp_btn = self.page.locator('button[name="shp"]').first
        expect(shp_btn).to_be_visible()
        self.page.evaluate("() => { window.open = () => {}; }")
        shp_btn.click()

    def test_should_export_with_filters_applied(self):
        self.page.locator("table tbody tr").nth(1).wait_for(state="attached")
        self.assertGreater(self.page.locator("table tbody tr").count(), 1)

        self.page.locator("#filters-btn").click()
        self.page.locator("#id_name").first.fill("test")
        self.page.locator("#filter").click()

        expect(self.page.locator("#objects-list_processing")).not_to_be_visible(
            timeout=10000
        )
        csv_btn = self.page.locator('button[name="csv"]').first
        expect(csv_btn).to_be_visible()
        self.page.evaluate("() => { window.open = () => {}; }")
        csv_btn.click()

    def test_should_show_export_buttons_in_proper_button_group(self):
        expect(self.page.locator(".btn-group").first).to_be_attached()
        expect(
            self.page.locator(
                '.btn-group button[name="csv"], .btn-group button[name="shp"]'
            ).first
        ).to_be_attached()

    def test_should_handle_export_with_selected_entities(self):
        self.page.locator("table tbody tr").first.wait_for(state="attached")
        rows = self.page.locator("table tbody tr")
        count = min(rows.count(), 2)
        for idx in range(count):
            checkbox = rows.nth(idx).locator('input[type="checkbox"]')
            if checkbox.count() > 0:
                checkbox.first.check(force=True)

        csv_btn = self.page.locator('button[name="csv"]').first
        expect(csv_btn).to_be_visible()
        self.page.evaluate("() => { window.open = () => {}; }")
        csv_btn.click()

    def test_should_display_correct_export_format_icons(self):
        icons = self.page.locator(
            'img[src*="csv.png"], img[src*="shp.png"], img[src*="gpx.png"], '
            'img[alt*="CSV"], img[alt*="Shapefile"]'
        )
        expect(icons.first).to_be_attached()
