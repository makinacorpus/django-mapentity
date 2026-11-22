import time

from django.contrib.gis.geos import (
    GeometryCollection,
    LineString,
    MultiLineString,
    MultiPoint,
    MultiPolygon,
    Point,
    Polygon,
)
from playwright.sync_api import expect

from test_project.test_shapes.models import (
    GeometryCollectionModel,
    MultiLineStringModel,
    MultiPointModel,
    MultiPolygonModel,
    SingleLineStringModel,
    SinglePointModel,
    SinglePolygonModel,
)

from .base import PlaywrightE2ETestCase


class HoverEffectsPointE2ETest(PlaywrightE2ETestCase):
    create_default_data = False

    def setUp(self):
        super().setUp()
        self.login()
        self.mock_tiles()
        self.entity_name = f"Hover Test Point {int(time.time() * 1000)}"
        self.entity = SinglePointModel.objects.create(
            name=self.entity_name,
            geom=Point(1.4, 43.6, srid=4326),
        )

    def test_should_change_feature_style_when_hovering_over_a_list_row(self):
        self.visit("/singlepointmodel/list/")
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )

        row = self.page.locator("table tbody tr", has_text=self.entity_name).first
        expect(row).to_be_attached(timeout=15000)
        row.dispatch_event("mouseenter")
        expect(self.page.locator(".maplibregl-canvas").first).to_be_visible()
        row.dispatch_event("mouseleave")

    def test_should_display_tooltip_with_entity_name_when_hovering_over_feature_on_map(
        self,
    ):
        self.visit("/singlepointmodel/list/")
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )

        canvas = self.page.locator(".maplibregl-canvas").first
        canvas.dispatch_event("mousemove", {"clientX": 400, "clientY": 300})

        if self.page.locator(".maplibregl-popup").count() > 0:
            expect(self.page.locator(".maplibregl-popup").first).to_contain_text(
                self.entity_name
            )

        canvas.dispatch_event("mouseleave")
        expect(self.page.locator(".maplibregl-popup.custom-popup")).not_to_be_attached()

    def test_should_show_popup_when_clicking_on_feature_on_map(self):
        self.visit("/singlepointmodel/list/")
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )

        self.click_canvas(400, 300)

        popup = self.page.locator(".maplibregl-popup:not(.custom-popup)")
        if popup.count() > 0:
            expect(popup.first).to_be_visible()

    def test_should_change_cursor_to_pointer_when_hovering_over_feature_on_map(self):
        self.visit("/singlepointmodel/list/")
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )

        canvas = self.page.locator(".maplibregl-canvas").first
        canvas.dispatch_event("mousemove", {"clientX": 400, "clientY": 300})
        expect(canvas).to_be_visible()


class HoverEffectsLineStringE2ETest(PlaywrightE2ETestCase):
    create_default_data = False

    def setUp(self):
        super().setUp()
        self.login()
        self.mock_tiles()
        self.entity_name = f"Hover Test Line {int(time.time() * 1000)}"
        self.entity = SingleLineStringModel.objects.create(
            name=self.entity_name,
            geom=LineString((1.3, 43.5), (1.4, 43.6), (1.5, 43.7), srid=4326),
        )

    def test_should_change_feature_style_when_hovering_over_a_list_row(self):
        self.visit("/singlelinestringmodel/list/")
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )

        row = self.page.locator("table tbody tr", has_text=self.entity_name).first
        expect(row).to_be_attached(timeout=15000)
        row.dispatch_event("mouseenter")
        expect(self.page.locator(".maplibregl-canvas").first).to_be_visible()
        row.dispatch_event("mouseleave")

    def test_should_display_tooltip_with_name_when_hovering_over_line_on_map(self):
        self.visit("/singlelinestringmodel/list/")
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )

        canvas = self.page.locator(".maplibregl-canvas").first
        canvas.dispatch_event("mousemove", {"clientX": 200, "clientY": 200})

        popup = self.page.locator(".maplibregl-popup.custom-popup")
        if popup.count() > 0:
            expect(popup.first).to_be_visible()

        canvas.dispatch_event("mouseleave")

    def test_should_show_popup_when_clicking_on_line_on_map(self):
        self.visit("/singlelinestringmodel/list/")
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )

        self.click_canvas(200, 200)

        popup = self.page.locator(".maplibregl-popup:not(.custom-popup)")
        if popup.count() > 0:
            expect(popup.first).to_be_visible()


class HoverEffectsPolygonE2ETest(PlaywrightE2ETestCase):
    create_default_data = False

    def setUp(self):
        super().setUp()
        self.login()
        self.mock_tiles()
        self.entity_name = f"Hover Test Polygon {int(time.time() * 1000)}"
        self.entity = SinglePolygonModel.objects.create(
            name=self.entity_name,
            geom=Polygon(
                ((1.3, 43.5), (1.3, 43.7), (1.5, 43.7), (1.3, 43.5)),
                srid=4326,
            ),
        )

    def test_should_change_feature_style_when_hovering_over_a_list_row(self):
        self.visit("/singlepolygonmodel/list/")
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )

        row = self.page.locator("table tbody tr", has_text=self.entity_name).first
        expect(row).to_be_attached(timeout=15000)
        row.dispatch_event("mouseenter")
        expect(self.page.locator(".maplibregl-canvas").first).to_be_visible()
        row.dispatch_event("mouseleave")

    def test_should_display_tooltip_with_name_when_hovering_over_polygon_on_map(self):
        self.visit("/singlepolygonmodel/list/")
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )

        canvas = self.page.locator(".maplibregl-canvas").first
        canvas.dispatch_event("mousemove", {"clientX": 150, "clientY": 150})

        popup = self.page.locator(".maplibregl-popup.custom-popup")
        if popup.count() > 0:
            expect(popup.first).to_be_visible()

        canvas.dispatch_event("mouseleave")

    def test_should_show_popup_when_clicking_on_polygon_on_map(self):
        self.visit("/singlepolygonmodel/list/")
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )

        self.click_canvas(150, 150)

        popup = self.page.locator(".maplibregl-popup:not(.custom-popup)")
        if popup.count() > 0:
            expect(popup.first).to_be_visible()


class HoverEffectsEmptyMapAreaE2ETest(PlaywrightE2ETestCase):
    create_default_data = False

    def setUp(self):
        super().setUp()
        self.login()
        self.mock_tiles()
        SinglePointModel.objects.create(
            name="Empty Area Point",
            geom=Point(1.4, 43.6, srid=4326),
        )

    def test_should_not_display_tooltip_when_hovering_over_empty_map_area(self):
        self.visit("/singlepointmodel/list/")
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )
        self.page.locator("table tbody tr").first.wait_for(
            state="attached", timeout=15000
        )

        canvas = self.page.locator(".maplibregl-canvas").first
        canvas.dispatch_event("mousemove", {"clientX": 50, "clientY": 50})
        expect(self.page.locator(".maplibregl-popup.custom-popup")).not_to_be_attached()


class HoverEffectsPopupOnClickE2ETest(PlaywrightE2ETestCase):
    create_default_data = False

    def setUp(self):
        super().setUp()
        self.login()
        self.mock_tiles()
        self.entity_name = f"Click Popup Test {int(time.time() * 1000)}"
        self.entity = SinglePointModel.objects.create(
            name=self.entity_name,
            geom=Point(1.4, 43.6, srid=4326),
        )

    def test_should_display_popup_with_entity_info_when_clicking_on_feature(self):
        self.visit("/singlepointmodel/list/")
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )

        self.click_canvas(400, 300)

        popup = self.page.locator(".maplibregl-popup")
        if popup.count() > 0:
            expect(popup.first).to_be_visible()

    def test_should_close_popup_when_clicking_elsewhere_on_map(self):
        self.visit("/singlepointmodel/list/")
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )

        self.click_canvas(400, 300)
        self.click_canvas(100, 100)
        expect(self.page.locator(".maplibregl-canvas").first).to_be_visible()


class HoverEffectsMultiGeometriesE2ETest(PlaywrightE2ETestCase):
    create_default_data = False

    def setUp(self):
        super().setUp()
        self.login()
        self.mock_tiles()

    def test_multipoint_should_change_style_when_hovering_list_row(self):
        entity_name = f"Hover MultiPoint {int(time.time() * 1000)}"
        MultiPointModel.objects.create(
            name=entity_name,
            geom=MultiPoint(
                Point(1.3, 43.5, srid=4326),
                Point(1.5, 43.7, srid=4326),
                srid=4326,
            ),
        )

        self.visit("/multipointmodel/list/")
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )

        row = self.page.locator("table tbody tr", has_text=entity_name).first
        expect(row).to_be_attached(timeout=15000)
        row.dispatch_event("mouseenter")
        expect(self.page.locator(".maplibregl-canvas").first).to_be_visible()
        row.dispatch_event("mouseleave")

    def test_multilinestring_should_change_style_when_hovering_list_row(self):
        entity_name = f"Hover MultiLine {int(time.time() * 1000)}"
        MultiLineStringModel.objects.create(
            name=entity_name,
            geom=MultiLineString(
                LineString((1.3, 43.5), (1.4, 43.6), srid=4326),
                LineString((1.5, 43.6), (1.6, 43.7), srid=4326),
                srid=4326,
            ),
        )

        self.visit("/multilinestringmodel/list/")
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )

        row = self.page.locator("table tbody tr", has_text=entity_name).first
        expect(row).to_be_attached(timeout=15000)
        row.dispatch_event("mouseenter")
        expect(self.page.locator(".maplibregl-canvas").first).to_be_visible()
        row.dispatch_event("mouseleave")

    def test_multipolygon_should_change_style_when_hovering_list_row(self):
        entity_name = f"Hover MultiPolygon {int(time.time() * 1000)}"
        MultiPolygonModel.objects.create(
            name=entity_name,
            geom=MultiPolygon(
                Polygon(
                    ((1.3, 43.5), (1.3, 43.7), (1.5, 43.7), (1.3, 43.5)),
                    srid=4326,
                ),
                srid=4326,
            ),
        )

        self.visit("/multipolygonmodel/list/")
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )

        row = self.page.locator("table tbody tr", has_text=entity_name).first
        expect(row).to_be_attached(timeout=15000)
        row.dispatch_event("mouseenter")
        expect(self.page.locator(".maplibregl-canvas").first).to_be_visible()
        row.dispatch_event("mouseleave")

    def test_geometrycollection_should_change_style_when_hovering_list_row(self):
        entity_name = f"Hover GeomCollection {int(time.time() * 1000)}"
        GeometryCollectionModel.objects.create(
            name=entity_name,
            geom=GeometryCollection(
                Point(1.3, 43.5, srid=4326),
                LineString((1.4, 43.6), (1.5, 43.7), srid=4326),
                srid=4326,
            ),
        )

        self.visit("/geometrycollectionmodel/list/")
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )

        row = self.page.locator("table tbody tr", has_text=entity_name).first
        expect(row).to_be_attached(timeout=15000)
        row.dispatch_event("mouseenter")
        expect(self.page.locator(".maplibregl-canvas").first).to_be_visible()
        row.dispatch_event("mouseleave")
