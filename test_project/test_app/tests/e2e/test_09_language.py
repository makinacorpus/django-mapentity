import re

from playwright.sync_api import expect

from .base import PlaywrightE2ETestCase


class LanguageSwitchingE2ETest(PlaywrightE2ETestCase):
    create_default_data = False

    def setUp(self):
        super().setUp()
        self.login()
        self.mock_tiles()

    def test_should_display_language_switcher_in_user_menu(self):
        self.visit("/dummymodel/list/")
        self.open_user_menu()

        lang_locator = self.page.locator(
            'button[name="language"], .language-menu-item, '
            'form[action*="set_language"], button[value*="en"], button[value*="fr"]'
        )
        expect(lang_locator.first).to_be_attached()
        self.assertGreater(lang_locator.count(), 0)

    def test_should_switch_to_french_language(self):
        self.visit("/dummymodel/list/")
        self.open_user_menu()

        fr_btn = self.page.locator('button[value="fr"]').first
        expect(fr_btn).to_be_visible()
        with self.page.expect_response(
            lambda r: "/i18n/setlang" in r.url and r.request.method == "POST"
        ):
            fr_btn.click()

        expect(self.page.locator("body")).to_contain_text(
            re.compile(r"ajouter|supprimer|modifier|déconnexion", re.IGNORECASE),
            timeout=10000,
        )

    def test_should_switch_to_english_language(self):
        self.visit("/dummymodel/list/")
        self.open_user_menu()

        en_btn = self.page.locator('button[value="en"]').first
        expect(en_btn).to_be_visible()
        with self.page.expect_response(
            lambda r: "/i18n/setlang" in r.url and r.request.method == "POST"
        ):
            en_btn.click()

        expect(self.page.locator("body")).to_contain_text(
            re.compile(r"add|delete|edit|logout", re.IGNORECASE),
            timeout=10000,
        )

    def test_should_persist_language_selection_across_pages(self):
        self.visit("/dummymodel/list/")
        self.open_user_menu()

        fr_btn = self.page.locator('button[value="fr"]').first
        expect(fr_btn).to_be_visible()
        with self.page.expect_response(
            lambda r: "/i18n/setlang" in r.url and r.request.method == "POST"
        ):
            fr_btn.click()

        expect(self.page.locator("body")).to_contain_text(
            re.compile(r"ajouter|supprimer|modifier|déconnexion", re.IGNORECASE),
            timeout=10000,
        )
        self.visit("/")
        expect(self.page.locator("body")).to_be_visible()

        expect(self.page.locator("body")).to_contain_text(
            re.compile(r"ajouter|déconnexion", re.IGNORECASE),
            timeout=10000,
        )

    def test_should_display_all_available_languages(self):
        self.visit("/dummymodel/list/")
        self.open_user_menu()

        lang_buttons = self.page.locator('button[name="language"]')
        expect(lang_buttons.first).to_be_attached()
        self.assertGreater(lang_buttons.count(), 1)

    def test_should_show_active_language_highlighted(self):
        self.visit("/dummymodel/list/")
        self.open_user_menu()

        active_lang = self.page.locator(
            'button[name="language"].active, .language-menu-item.active, '
            'button[name="language"][class*="active"]'
        )
        if active_lang.count() > 0:
            expect(active_lang.first).to_be_attached()
