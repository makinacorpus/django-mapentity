import re

from playwright.sync_api import expect

from .base import PlaywrightE2ETestCase


class DummyModelFilterAndSearchE2ETest(PlaywrightE2ETestCase):
    def setUp(self):
        super().setUp()
        self.login()
        self.mock_tiles()
        with self.page.expect_response(
            lambda r: (
                "/api/dummymodel/drf/dummymodels.datatables" in r.url
                and "bbox=" in r.url
            )
        ):
            self.visit("/dummymodel/list/")
        self.page.locator("table tbody tr").nth(1).wait_for(state="attached")

    def test_should_display_the_search_input(self):
        expect(self.page.locator("body")).to_be_attached()
        expect(self.page.locator("#object-list-search")).to_be_attached()

    def test_should_filter_results_when_searching(self):
        initial_row_count = self.page.locator("table tbody tr").count()
        self.assertGreater(initial_row_count, 1)

        with self.page.expect_response(
            lambda r: (
                "/api/dummymodel/drf/dummymodels.datatables" in r.url
                and "search%5Bvalue%5D=test" in r.url
            )
        ):
            self.page.locator("#object-list-search").first.fill("test")

        expect(self.page.locator("table tbody tr")).not_to_have_count(initial_row_count)

    def test_should_display_the_filter_panel(self):
        self.assertGreater(self.page.locator("table tbody tr").count(), 1)
        self.page.locator("#filters-btn").click()
        expect(self.page.locator("#mainfilter.filter-form-loaded")).to_be_visible()

    def test_should_filter_results_using_the_name_input(self):
        initial_row_count = self.page.locator("table tbody tr").count()
        self.assertGreater(initial_row_count, 1)

        expect(self.page.locator("#filters-btn")).to_have_class(
            re.compile(r"\bbtn-info\b")
        )
        expect(self.page.locator("#filters-btn")).not_to_have_class(
            re.compile(r"\bbtn-warning\b")
        )

        self.page.locator("#filters-btn").click()
        expect(self.page.locator("#mainfilter.filter-form-loaded")).to_be_visible()

        self.page.locator("#id_name").first.fill("test")

        with self.page.expect_response(
            lambda r: (
                "/api/dummymodel/drf/dummymodels.datatables" in r.url
                and "bbox=" in r.url
            )
        ):
            self.page.locator("#filter").click()

        expect(self.page.locator("#filters-btn")).to_have_class(
            re.compile(r"\bbtn-warning\b")
        )
        expect(self.page.locator("#filters-btn")).not_to_have_class(
            re.compile(r"\bbtn-info\b")
        )
        expect(self.page.locator("table tbody tr")).not_to_have_count(initial_row_count)

    def test_should_filter_results_using_a_select2_filter(self):
        initial_row_count = self.page.locator("table tbody tr").count()
        self.assertGreater(initial_row_count, 1)

        self.page.locator("#filters-btn").click()
        expect(self.page.locator("#mainfilter.filter-form-loaded")).to_be_visible()

        self.page.locator("#id_tags").select_option(label=["Tag 1"], force=True)

        expect(self.page.locator("#filters-btn")).to_have_class(
            re.compile(r"\bbtn-warning\b")
        )
        expect(self.page.locator("#filters-btn")).not_to_have_class(
            re.compile(r"\bbtn-info\b")
        )

        with self.page.expect_response(
            lambda r: (
                "/api/dummymodel/drf/dummymodels.datatables" in r.url
                and "bbox=" in r.url
            )
        ):
            self.page.locator("#filter").click()

        expect(self.page.locator("#filters-btn")).to_have_class(
            re.compile(r"\bbtn-warning\b")
        )
        expect(self.page.locator("table tbody tr")).not_to_have_count(initial_row_count)

    def test_should_filter_results_using_a_select2_ajax_filter(self):
        with self.page.expect_response(
            lambda r: (
                "/api/complexmodel/drf/complexmodels.datatables" in r.url
                and "bbox=" in r.url
            )
        ):
            self.visit("/complexmodel/list/")

        self.page.locator("table tbody tr").nth(1).wait_for(state="attached")
        initial_row_count = self.page.locator("table tbody tr").count()
        self.assertGreater(initial_row_count, 1)

        self.page.locator("#filters-btn").click()
        expect(self.page.locator("#mainfilter.filter-form-loaded")).to_be_visible()

        self.page.locator("#id_road").locator("..").locator(".select2").click()
        with self.page.expect_response(
            lambda r: "/api/road/drf/roads/autocomplete" in r.url
        ):
            self.page.locator(
                ".select2-container--open .select2-search__field"
            ).first.fill("Road 0")

        option = self.page.locator(".select2-results__option", has_text="Road 0").first
        expect(option).to_be_visible()
        option.click()

        expect(self.page.locator("#filters-btn")).to_have_class(
            re.compile(r"\bbtn-warning\b")
        )

        with self.page.expect_response(
            lambda r: (
                "/api/complexmodel/drf/complexmodels.datatables" in r.url
                and "bbox=" in r.url
            )
        ):
            self.page.locator("#filter").click()

        expect(self.page.locator("#filters-btn")).to_have_class(
            re.compile(r"\bbtn-warning\b")
        )
        expect(self.page.locator("table tbody tr")).not_to_have_count(initial_row_count)

    def test_should_clear_search_results_when_resetting_filters(self):
        initial_row_count = self.page.locator("table tbody tr").count()
        self.assertGreater(initial_row_count, 1)

        self.page.locator("#filters-btn").click()
        expect(self.page.locator("#mainfilter.filter-form-loaded")).to_be_visible()

        self.page.locator("#id_name").first.fill("test")
        with self.page.expect_response(
            lambda r: (
                "/api/dummymodel/drf/dummymodels.datatables" in r.url
                and "bbox=" in r.url
            )
        ):
            self.page.locator("#filter").click()

        expect(self.page.locator("#filters-btn")).to_have_class(
            re.compile(r"\bbtn-warning\b")
        )

        with self.page.expect_response(
            lambda r: (
                "/api/dummymodel/drf/dummymodels.datatables" in r.url
                and "bbox=" in r.url
            )
        ):
            self.page.locator("#reset").click()

        expect(self.page.locator("#id_name").first).to_have_value("")
        expect(self.page.locator("#filters-btn")).to_have_class(
            re.compile(r"\bbtn-info\b")
        )
        expect(self.page.locator("#filters-btn")).not_to_have_class(
            re.compile(r"\bbtn-warning\b")
        )
        self.assertGreaterEqual(
            self.page.locator("table tbody tr").count(), initial_row_count
        )

    def test_should_persist_filters_in_url_parameters(self):
        self.assertGreater(self.page.locator("table tbody tr").count(), 1)

        with self.page.expect_request(
            lambda req: (
                "/api/dummymodel/drf/dummymodels.datatables" in req.url
                and "search%5Bvalue%5D=test" in req.url
            )
        ) as req_info:
            self.page.locator("#object-list-search").first.fill("test")

        self.assertIn("search%5Bvalue%5D=test", req_info.value.url)
