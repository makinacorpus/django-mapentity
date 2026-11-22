from .base import PlaywrightE2ETestCase


class DummyModelBatchUpdateE2ETest(PlaywrightE2ETestCase):
    def setUp(self):
        super().setUp()
        self.login()
        self.mock_tiles()

    def test_should_update_multiple_entities_via_list_actions(self):
        with self.page.expect_response(
            lambda r: (
                "/api/dummymodel/drf/dummymodels.datatables" in r.url
                and "bbox=" in r.url
            )
        ):
            self.visit("/dummymodel/list/")

        self.page.locator("table tbody tr").nth(1).wait_for(state="attached")
        self.assertGreater(self.page.locator("table tbody tr").count(), 1)

        self.page.locator(".dt-select-checkbox").first.click()
        self.page.locator("#btn-batch-editing").first.click()
        self.page.locator("#btn-edit").first.click()

        self.page.wait_for_url("**/dummymodel/multi_update/**")
        self.assertIn("/dummymodel/multi_update/", self.page.url)

        self.page.locator('select[name="public"]').select_option("true", force=True)
        self.page.locator("#submit-id-save").evaluate("el => el.click()")
        self.page.locator("#confirm-submit").evaluate("el => el.click()")
        self.page.wait_for_url("**/dummymodel/list**", timeout=15000)
