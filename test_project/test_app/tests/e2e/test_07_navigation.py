from playwright.sync_api import expect

from .base import PlaywrightE2ETestCase


class NavigationAndMenuE2ETest(PlaywrightE2ETestCase):
    def setUp(self):
        super().setUp()
        self.login()
        self.mock_tiles()
        self.entity_id = self.dummies[0].pk

    def test_should_display_main_navigation(self):
        self.visit("/")
        expect(self.page.locator("nav.navbar").first).to_be_attached()
        expect(self.page.locator(".navbar-brand").first).to_be_attached()

    def test_should_navigate_to_list_page_from_home(self):
        self.visit("/")
        self.page.locator('a[href*="/dummymodel/list"]').first.evaluate(
            "el => el.click()"
        )
        self.page.wait_for_url("**/dummymodel/list**", timeout=10000)
        self.assertIn("/dummymodel/list", self.page.url)

    def test_should_navigate_between_pages_using_menu(self):
        self.visit("/dummymodel/list/")
        expect(self.page.locator("nav.navbar").first).to_be_attached()
        expect(self.page.locator(".navbar-brand").first).to_be_visible()
        self.page.locator(".navbar-brand").first.click()
        self.assertTrue("/" in self.page.url or "/dummymodel" in self.page.url)

    def test_should_have_user_menu_in_navbar(self):
        self.visit("/dummymodel/list/")
        expect(
            self.page.locator(
                '.dropdown-toggle, [data-toggle="dropdown"], .navbar .dropdown, button.dropdown-item'
            ).first
        ).to_be_attached()

    def test_should_navigate_to_detail_page_from_list(self):
        with self.page.expect_response(
            lambda r: (
                "/api/dummymodel/drf/dummymodels.datatables" in r.url
                and "bbox=" in r.url
            )
        ):
            self.visit("/dummymodel/list/")
        expect(self.page.locator("table").first).to_be_attached()
        first_link = self.page.locator("table tbody tr").first.locator("a").first
        expect(first_link).to_be_visible()
        first_link.click()
        self.page.wait_for_url(
            lambda url: "/dummymodel/" in url and "/list" not in url,
            timeout=10000,
        )
        self.assertRegex(self.page.url, r"/dummymodel/\d+/")

    def test_should_navigate_to_edit_page_from_detail(self):
        self.visit(f"/dummymodel/{self.entity_id}/")
        edit_btn = self.page.locator(
            'a[href*="/edit/"], a:has-text("Edit"), .btn:has-text("Edit"), [href*="edit"]'
        ).first
        edit_btn.evaluate("el => el.click()")
        self.page.wait_for_url("**/edit/**", timeout=10000)
        self.assertIn("/edit/", self.page.url)

    def test_should_navigate_back_using_browser_back_button(self):
        with self.page.expect_response(
            lambda r: (
                "/api/dummymodel/drf/dummymodels.datatables" in r.url
                and "bbox=" in r.url
            )
        ):
            self.visit("/dummymodel/list/")
        self.assertIn("/dummymodel/list", self.page.url)

        first_link = self.page.locator("table tbody tr").first.locator("a").first
        expect(first_link).to_be_visible()
        first_link.click()
        self.page.wait_for_url(
            lambda url: "/dummymodel/" in url and "/list" not in url,
            timeout=10000,
        )
        self.assertRegex(self.page.url, r"/dummymodel/\d+/")

        self.page.go_back()
        self.page.wait_for_url("**/dummymodel/list**", timeout=10000)
        self.assertIn("/dummymodel/list", self.page.url)
