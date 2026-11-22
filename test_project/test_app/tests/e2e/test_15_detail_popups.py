import time

from django.contrib.gis.geos import LineString, Point, Polygon
from playwright.sync_api import expect

from test_project.test_shapes.models import (
    SingleLineStringModel,
    SinglePointModel,
    SinglePolygonModel,
)

from .base import PlaywrightE2ETestCase


class DetailPageCurrentObjectPopupE2ETest(PlaywrightE2ETestCase):
    create_default_data = False

    def setUp(self):
        super().setUp()
        self.login()
        self.mock_tiles()
        self.entity_name = f"Detail Popup Test {int(time.time() * 1000)}"
        self.entity = SinglePointModel.objects.create(
            name=self.entity_name,
            geom=Point(1.4, 43.6, srid=4326),
        )
        self.entity_id = str(self.entity.pk)

    def test_should_not_show_popup_when_clicking_on_the_current_object_on_detail_page(
        self,
    ):
        self.visit(f"/singlepointmodel/{self.entity_id}/")
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )
        expect(self.page.locator("body")).to_have_attribute("data-pk", self.entity_id)

        self.page.wait_for_timeout(500)
        self.click_canvas(400, 300)
        self.page.wait_for_timeout(300)

        expect(
            self.page.locator(".maplibregl-popup:not(.custom-popup)")
        ).not_to_be_attached()

    def test_should_not_show_tooltip_when_hovering_over_the_current_object_on_detail_page(
        self,
    ):
        self.visit(f"/singlepointmodel/{self.entity_id}/")
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )
        expect(self.page.locator("body")).to_have_attribute("data-pk", self.entity_id)

        self.page.wait_for_timeout(500)
        self.page.locator(".maplibregl-canvas").first.dispatch_event(
            "mousemove", {"clientX": 400, "clientY": 300}
        )
        self.page.wait_for_timeout(300)

        expect(self.page.locator(".maplibregl-popup.custom-popup")).not_to_be_attached()

    def test_should_have_the_map_visible_and_interactive_on_detail_page(self):
        self.visit(f"/singlepointmodel/{self.entity_id}/")
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )
        expect(self.page.locator(".maplibregl-canvas").first).to_be_visible()
        expect(self.page.locator("#detailmap")).to_be_attached()


class DetailPageOtherObjectsPopupE2ETest(PlaywrightE2ETestCase):
    create_default_data = False

    def setUp(self):
        super().setUp()
        self.login()
        self.mock_tiles()
        self.entity1 = SinglePointModel.objects.create(
            name=f"Detail Other Test 1 {int(time.time() * 1000)}",
            geom=Point(1.3, 43.5, srid=4326),
        )
        self.entity2 = SinglePointModel.objects.create(
            name=f"Detail Other Test 2 {int(time.time() * 1000)}",
            geom=Point(1.5, 43.7, srid=4326),
        )
        self.entity1_id = str(self.entity1.pk)

    def test_should_show_popup_when_clicking_on_another_object_on_detail_page(self):
        self.visit(f"/singlepointmodel/{self.entity1_id}/")
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )
        expect(self.page.locator("body")).to_have_attribute("data-pk", self.entity1_id)

        self.page.wait_for_timeout(500)
        self.click_canvas(500, 400)

        popup = self.page.locator(".maplibregl-popup:not(.custom-popup)")
        if popup.count() > 0:
            expect(popup.first).to_be_visible()

    def test_should_show_tooltip_when_hovering_over_another_object_on_detail_page(
        self,
    ):
        self.visit(f"/singlepointmodel/{self.entity1_id}/")
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )
        expect(self.page.locator("body")).to_have_attribute("data-pk", self.entity1_id)

        self.page.wait_for_timeout(500)
        canvas = self.page.locator(".maplibregl-canvas").first
        canvas.dispatch_event("mousemove", {"clientX": 500, "clientY": 400})

        popup = self.page.locator(".maplibregl-popup.custom-popup")
        if popup.count() > 0:
            expect(popup.first).to_be_visible()

        canvas.dispatch_event("mouseleave")


class DetailPageLineStringPopupE2ETest(PlaywrightE2ETestCase):
    create_default_data = False

    def setUp(self):
        super().setUp()
        self.login()
        self.mock_tiles()
        self.entity1 = SingleLineStringModel.objects.create(
            name=f"Detail Line Popup 1 {int(time.time() * 1000)}",
            geom=LineString((1.2, 43.4), (1.3, 43.5), (1.4, 43.45), srid=4326),
        )
        self.entity2 = SingleLineStringModel.objects.create(
            name=f"Detail Line Popup 2 {int(time.time() * 1000)}",
            geom=LineString((1.5, 43.6), (1.6, 43.7), (1.7, 43.65), srid=4326),
        )
        self.entity1_id = str(self.entity1.pk)

    def test_should_not_show_popup_when_clicking_on_the_current_line_on_detail_page(
        self,
    ):
        self.visit(f"/singlelinestringmodel/{self.entity1_id}/")
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )
        expect(self.page.locator("body")).to_have_attribute("data-pk", self.entity1_id)

        self.page.wait_for_timeout(500)
        self.click_canvas(200, 200)
        self.page.wait_for_timeout(300)

        expect(
            self.page.locator(".maplibregl-popup:not(.custom-popup)")
        ).not_to_be_attached()

    def test_should_not_show_tooltip_when_hovering_over_the_current_line_on_detail_page(
        self,
    ):
        self.visit(f"/singlelinestringmodel/{self.entity1_id}/")
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )
        expect(self.page.locator("body")).to_have_attribute("data-pk", self.entity1_id)

        self.page.wait_for_timeout(500)
        self.page.locator(".maplibregl-canvas").first.dispatch_event(
            "mousemove", {"clientX": 200, "clientY": 200}
        )
        self.page.wait_for_timeout(300)

        expect(self.page.locator(".maplibregl-popup.custom-popup")).not_to_be_attached()

    def test_should_show_popup_when_clicking_on_another_line_on_detail_page(self):
        self.visit(f"/singlelinestringmodel/{self.entity1_id}/")
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )
        expect(self.page.locator("body")).to_have_attribute("data-pk", self.entity1_id)

        self.page.wait_for_timeout(500)
        self.click_canvas(450, 350)

        popup = self.page.locator(".maplibregl-popup:not(.custom-popup)")
        if popup.count() > 0:
            expect(popup.first).to_be_visible()

    def test_should_show_tooltip_when_hovering_over_another_line_on_detail_page(self):
        self.visit(f"/singlelinestringmodel/{self.entity1_id}/")
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )
        expect(self.page.locator("body")).to_have_attribute("data-pk", self.entity1_id)

        self.page.wait_for_timeout(500)
        canvas = self.page.locator(".maplibregl-canvas").first
        canvas.dispatch_event("mousemove", {"clientX": 450, "clientY": 350})

        popup = self.page.locator(".maplibregl-popup.custom-popup")
        if popup.count() > 0:
            expect(popup.first).to_be_visible()

        canvas.dispatch_event("mouseleave")


class DetailPagePolygonPopupE2ETest(PlaywrightE2ETestCase):
    create_default_data = False

    def setUp(self):
        super().setUp()
        self.login()
        self.mock_tiles()
        self.entity1 = SinglePolygonModel.objects.create(
            name=f"Detail Polygon Popup 1 {int(time.time() * 1000)}",
            geom=Polygon(
                ((1.2, 43.4), (1.4, 43.4), (1.4, 43.6), (1.2, 43.4)),
                srid=4326,
            ),
        )
        self.entity2 = SinglePolygonModel.objects.create(
            name=f"Detail Polygon Popup 2 {int(time.time() * 1000)}",
            geom=Polygon(
                ((1.5, 43.6), (1.7, 43.6), (1.7, 43.8), (1.5, 43.6)),
                srid=4326,
            ),
        )
        self.entity1_id = str(self.entity1.pk)

    def test_should_not_show_popup_when_clicking_on_the_current_polygon_on_detail_page(
        self,
    ):
        self.visit(f"/singlepolygonmodel/{self.entity1_id}/")
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )
        expect(self.page.locator("body")).to_have_attribute("data-pk", self.entity1_id)

        self.page.wait_for_timeout(500)
        self.click_canvas(150, 150)
        self.page.wait_for_timeout(300)

        expect(self.page.locator(".maplibregl-popup")).not_to_be_attached()

    def test_should_not_show_tooltip_when_hovering_over_the_current_polygon_on_detail_page(
        self,
    ):
        self.visit(f"/singlepolygonmodel/{self.entity1_id}/")
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )
        expect(self.page.locator("body")).to_have_attribute("data-pk", self.entity1_id)

        self.page.wait_for_timeout(500)
        self.page.locator(".maplibregl-canvas").first.dispatch_event(
            "mousemove", {"clientX": 150, "clientY": 150}
        )
        self.page.wait_for_timeout(300)

        expect(self.page.locator(".maplibregl-popup.custom-popup")).not_to_be_attached()

    def test_should_show_popup_when_clicking_on_another_polygon_on_detail_page(self):
        self.visit(f"/singlepolygonmodel/{self.entity1_id}/")
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )
        expect(self.page.locator("body")).to_have_attribute("data-pk", self.entity1_id)

        self.page.wait_for_timeout(500)
        self.click_canvas(450, 350)

        popup = self.page.locator(".maplibregl-popup:not(.custom-popup)")
        if popup.count() > 0:
            expect(popup.first).to_be_visible()

    def test_should_show_tooltip_when_hovering_over_another_polygon_on_detail_page(
        self,
    ):
        self.visit(f"/singlepolygonmodel/{self.entity1_id}/")
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )
        expect(self.page.locator("body")).to_have_attribute("data-pk", self.entity1_id)

        self.page.wait_for_timeout(500)
        canvas = self.page.locator(".maplibregl-canvas").first
        canvas.dispatch_event("mousemove", {"clientX": 450, "clientY": 350})

        popup = self.page.locator(".maplibregl-popup.custom-popup")
        if popup.count() > 0:
            expect(popup.first).to_be_visible()

        canvas.dispatch_event("mouseleave")
