import re

from playwright.sync_api import expect

from .base import PlaywrightE2ETestCase


class DummyModelDeleteE2ETest(PlaywrightE2ETestCase):
    def setUp(self):
        super().setUp()
        self.login()
        self.mock_tiles()

    def test_should_delete_a_single_entity(self):
        with self.page.expect_response(
            lambda r: (
                "/api/dummymodel/drf/dummymodels.datatables" in r.url
                and "bbox=" in r.url
            )
        ):
            self.visit("/dummymodel/list/")

        self.page.locator("table tbody tr").nth(1).wait_for(state="attached")
        rows = self.page.locator("table tbody tr")
        total_count = rows.count()
        self.assertGreater(total_count, 5)

        href = rows.first.locator("a").first.get_attribute("href")
        match = re.search(r"/dummymodel/(\d+)/", href)
        self.assertIsNotNone(match)
        entity_id = match.group(1)

        self.visit(f"/dummymodel/delete/{entity_id}/")
        delete_form = self.page.locator(
            'form[action*="/delete/"], form[method="POST"], form[method="post"]'
        ).last
        expect(delete_form).to_be_attached()

        submit_btn = self.page.locator(
            'button[type="submit"], input[type="submit"]'
        ).filter(has_text=re.compile(r"delete|confirm", re.IGNORECASE))
        if submit_btn.count() > 0:
            submit_btn.first.click()
        else:
            delete_form.locator(
                'button[type="submit"], input[type="submit"]'
            ).first.click()

        self.page.wait_for_url("**/dummymodel/list**", timeout=10000)
        self.assertIn("/dummymodel/list", self.page.url)

    def test_should_delete_multiple_entities_via_list_actions(self):
        with self.page.expect_response(
            lambda r: (
                "/api/dummymodel/drf/dummymodels.datatables" in r.url
                and "bbox=" in r.url
            )
        ):
            self.visit("/dummymodel/list/")

        self.page.locator("table tbody tr").nth(1).wait_for(state="attached")
        total_count = self.page.locator("table tbody tr").count()
        self.assertGreater(total_count, 10)

        checkboxes = self.page.locator("table tbody .dt-select-checkbox")
        checkboxes.nth(0).click()
        checkboxes.nth(1).click()
        self.page.locator("#btn-batch-editing").first.click()
        self.page.locator("#btn-delete").first.click()

        self.page.wait_for_url("**/dummymodel/multi_delete/**", timeout=15000)
        self.page.locator(
            'form input[type="submit"], form button[type="submit"]'
        ).last.evaluate("el => el.click()")
        self.page.wait_for_url("**/dummymodel/list**", timeout=15000)
