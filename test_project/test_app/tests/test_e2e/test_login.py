import os

from django.contrib.staticfiles.testing import StaticLiveServerTestCase
from playwright.sync_api import sync_playwright

from mapentity.tests import UserFactory


class MyViewTests(StaticLiveServerTestCase):
    @classmethod
    def setUpClass(cls):
        os.environ["DJANGO_ALLOW_ASYNC_UNSAFE"] = "true"
        super().setUpClass()
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch()

    @classmethod
    def setUpTestData(cls):
        cls.user = UserFactory.create(username="test", password="secret")

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        cls.browser.close()
        cls.playwright.stop()

    def test_login(self):
        page = self.browser.new_page()
        page.goto(f"{self.live_server_url}/login/")
        page.wait_for_selector("form")
        page.fill("[name=username]", "test")
        page.fill("[name=password]", "secret")
        page.click("button[type=submit]")
        page.get("button", name=" test").click()
        page.get_by_role("button", name=" Logout").click()


        page.close()
