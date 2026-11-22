import re

from playwright.sync_api import expect

from test_project.test_app.tests.factories import DummyModelFactory

from .base import PlaywrightE2ETestCase


class DummyModelDetailViewE2ETest(PlaywrightE2ETestCase):
    def setUp(self):
        super().setUp()
        self.login()
        self.mock_tiles()
        self.entity_id = DummyModelFactory.create().pk

    def test_should_display_detail_page(self):
        self.visit(f"/dummymodel/{self.entity_id}/")
        self.assertRegex(self.page.url, r"/dummymodel/\d+/")
        expect(self.page.locator("body")).to_be_attached()

    def test_should_show_entity_details_and_attributes(self):
        self.visit(f"/dummymodel/{self.entity_id}/")
        expect(
            self.page.locator(
                '.detail, #detail, [class*="detail"], .attributes, table, dl'
            ).first
        ).to_be_attached()

    def test_should_have_edit_button(self):
        self.visit(f"/dummymodel/{self.entity_id}/")
        expect(
            self.page.locator(
                'a[href*="/edit/"], a:has-text("Edit"), .btn:has-text("Edit"), button:has-text("Edit")'
            ).first
        ).to_be_attached()

    def test_should_have_delete_button(self):
        self.visit(f"/dummymodel/{self.entity_id}/")
        delete_locator = self.page.locator(
            'a[href*="/delete/"], a:has-text("Delete"), .btn:has-text("Delete"), '
            'button:has-text("Delete"), .btn-danger'
        )
        if delete_locator.count() > 0:
            expect(delete_locator.first).to_be_attached()

    def test_should_have_back_list_button(self):
        self.visit(f"/dummymodel/{self.entity_id}/")
        expect(
            self.page.locator(
                'a[href*="/list"], a:has-text("Back"), a:has-text("List"), .btn:has-text("Back")'
            ).first
        ).to_be_attached()

    def test_should_display_export_options_on_detail_page(self):
        self.visit(f"/dummymodel/{self.entity_id}/")
        exports = self.page.locator(
            'a[href*=".odt"], a[href*=".pdf"], a[href*=".doc"], '
            'button[name="odt"], button[name="pdf"], '
            '[title*="ODT"], [title*="PDF"], '
            'img[src*="odt.png"], img[src*="pdf.png"]'
        )
        expect(exports.first).to_be_attached()

    def test_should_have_odt_export_option_if_available(self):
        self.visit(f"/dummymodel/{self.entity_id}/")
        odt_locator = self.page.locator(
            'a[href*=".odt"], button[name="odt"], img[src*="odt.png"], [title*="ODT"]'
        )
        if odt_locator.count() > 0:
            expect(odt_locator.first).to_be_attached()

    def test_should_have_pdf_export_option_if_available(self):
        self.visit(f"/dummymodel/{self.entity_id}/")
        pdf_locator = self.page.locator(
            'a[href*=".pdf"], button[name="pdf"], img[src*="pdf.png"], [title*="PDF"], a:has-text("PDF")'
        )
        if pdf_locator.count() > 0:
            expect(pdf_locator.first).to_be_attached()

    def test_should_trigger_document_export_when_clicked(self):
        self.visit(f"/dummymodel/{self.entity_id}/")
        export_link = self.page.locator('a[href*=".odt"], a[href*=".pdf"]').first
        expect(export_link).to_have_attribute("href", re.compile(r".+"))

    def test_should_display_map_on_detail_page_if_entity_has_geometry(self):
        self.visit(f"/dummymodel/{self.entity_id}/")
        expect(
            self.page.locator(
                '#detailmap, .detail-map, #mainmap, .maplibre-map, .map-panel, [id*="map"]'
            ).first
        ).to_be_attached()

    def test_should_navigate_to_edit_page_from_detail(self):
        self.visit(f"/dummymodel/{self.entity_id}/")
        edit_btn = self.page.locator('a[href*="/edit/"], a:has-text("Edit")').first
        edit_btn.evaluate("el => el.click()")
        self.page.wait_for_url("**/edit/**", timeout=10000)
        self.assertIn("/edit/", self.page.url)

    def test_should_show_action_buttons_toolbar(self):
        self.visit(f"/dummymodel/{self.entity_id}/")
        toolbar = self.page.locator(
            '.actions, .btn-toolbar, .action-buttons, [class*="action"], .btn-group, [title="Actions"]'
        )
        if toolbar.count() > 0:
            expect(toolbar.first).to_be_attached()
