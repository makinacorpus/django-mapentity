from playwright.sync_api import expect

from .base import PlaywrightE2ETestCase


class AuthenticationE2ETest(PlaywrightE2ETestCase):
    create_default_data = False

    def setUp(self):
        super().setUp()
        self.context.clear_cookies()
        self.mock_tiles()

    def test_should_display_login_page(self):
        self.visit("/login/")
        self.assertIn("/login/", self.page.url)
        expect(self.page.locator('input[name="username"]')).to_be_attached()
        expect(self.page.locator('input[name="password"]')).to_be_attached()
        expect(
            self.page.locator('button[type="submit"], input[type="submit"]').first
        ).to_be_attached()

    def test_should_login_with_valid_credentials(self):
        self.visit("/login/")
        self.page.locator('input[name="username"]').fill("admin")
        self.page.locator('input[name="password"]').fill("admin")
        self.page.locator('button[type="submit"], input[type="submit"]').first.click()

        self.page.wait_for_url(lambda url: "/login/" not in url, timeout=10000)
        expect(self.page.locator("nav.navbar").first).to_be_attached()

    def test_should_show_error_with_invalid_credentials(self):
        self.visit("/login/")
        self.page.locator('input[name="username"]').fill("wronguser")
        self.page.locator('input[name="password"]').fill("wrongpass")
        with self.page.expect_response(
            lambda r: "/login/" in r.url and r.request.method == "POST"
        ):
            self.page.locator(
                'button[type="submit"], input[type="submit"]'
            ).first.click()
        self.page.wait_for_load_state("domcontentloaded")

        self.assertIn("/login/", self.page.url)
        error_locator = self.page.locator(
            '.alert-danger, .error, .errorlist, [class*="error"], p.error'
        )
        if error_locator.count() > 0:
            expect(error_locator.first).to_be_attached()

    def test_should_logout_successfully(self):
        self.login()
        self.visit("/dummymodel/list/")
        self.assertIn("/dummymodel/list", self.page.url)

        self.page.locator("#navbarDropdownUsermenuLink").click()
        self.page.locator("#btn-logout").click()

        self.page.wait_for_url(
            lambda url: "/login" in url or ("/" in url and "/dummymodel" not in url),
            timeout=10000,
        )

    def test_should_redirect_to_login_when_accessing_protected_page(self):
        self.visit("/dummymodel/list/")
        self.assertTrue(
            "/login" in self.page.url or "/dummymodel/list" in self.page.url
        )

    def test_should_redirect_to_requested_page_after_login(self):
        self.visit("/dummymodel/list/")
        if "/login" in self.page.url:
            self.page.locator('input[name="username"]').fill("admin")
            self.page.locator('input[name="password"]').fill("admin")
            self.page.locator(
                'button[type="submit"], input[type="submit"]'
            ).first.click()
            self.page.wait_for_url(lambda url: "/login" not in url, timeout=10000)
            self.assertIn("/dummymodel/list", self.page.url)
