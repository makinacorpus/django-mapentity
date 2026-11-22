import time

from django.contrib.gis.geos import LineString
from playwright.sync_api import expect

from test_project.test_app.models import Road

from .base import PlaywrightE2ETestCase


class RoadSnappingE2ETest(PlaywrightE2ETestCase):
    create_default_data = False

    def setUp(self):
        super().setUp()
        self.login()
        self.mock_tiles()
        line = LineString((1.3, 43.5), (1.4, 43.6), (1.5, 43.7), srid=4326)
        line.transform(2154)
        self.road = Road.objects.create(
            name="Snap Target Road",
            geom=line,
        )
        self.road_id = self.road.pk

    def test_should_have_data_modelname_attribute_set_to_road_on_the_add_page(self):
        self.visit("/road/add/")
        expect(self.page.locator("body")).to_have_attribute("data-modelname", "road")

    def test_should_have_snappingconfig_in_the_widget_options(self):
        self.visit("/road/add/")
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )
        self.wait_for_geoman()

        self.page.wait_for_function(
            "() => Boolean(window.mapentity_map)",
            timeout=15000,
        )

    def test_should_add_snap_source_and_layer_to_the_map(self):
        self.visit("/road/add/")
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )
        self.wait_for_geoman()

        self.page.wait_for_function(
            """() => {
                const map = window.mapentity_map;
                if (!map) return false;
                return Boolean(
                    map.getSource('mapentity-snap-source-road') &&
                    map.getLayer('mapentity-snap-layer-road')
                );
            }""",
            timeout=15000,
        )

    def test_should_activate_geoman_snapping_helper(self):
        self.visit("/road/add/")
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )
        self.wait_for_geoman()

        self.page.wait_for_function(
            """() => {
                return Boolean(
                    window.gm &&
                    window.gm.actionInstances &&
                    window.gm.actionInstances['helper__snapping']
                );
            }""",
            timeout=15000,
        )

    def test_should_have_setcustomsnappingcoordinates_available_when_drawing(self):
        self.visit("/road/add/")
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )
        self.wait_for_geoman()

        self.page.wait_for_function(
            """() => {
                const map = window.mapentity_map;
                return Boolean(map && map.getSource('mapentity-snap-source-road'));
            }""",
            timeout=15000,
        )

        self.page.locator("#id_geom_draw_line").click()

        self.page.wait_for_function(
            """() => {
                const helper = window.gm && window.gm.actionInstances && window.gm.actionInstances['helper__snapping'];
                return Boolean(helper && typeof helper.setCustomSnappingCoordinates === 'function');
            }""",
            timeout=10000,
        )

    def test_should_create_a_second_road_with_snapping_enabled_and_save_successfully(
        self,
    ):
        self.visit("/road/add/")
        entity_name = f"Snapped Road {int(time.time() * 1000)}"
        self.page.locator('input[name="name_en"]').fill(entity_name)
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )
        self.wait_for_geoman()
        self.page.wait_for_function(
            """() => {
                const map = window.mapentity_map;
                return Boolean(map && map.getSource('mapentity-snap-source-road'));
            }""",
            timeout=15000,
        )

        self.page.locator("#id_geom_draw_line").click()
        self.click_canvas(200, 210)
        self.click_canvas(300, 210)
        self.click_canvas(400, 210)
        self.page.locator(".maplibregl-marker").last.click(force=True)

        def _check(data):
            self.assertEqual(data["type"], "LineString")
            self.assertEqual(len(data["coordinates"]), 3)

        self.assert_geom_field_value(_check)

        self.page.locator("#save_changes").click()
        self.page.wait_for_url(
            lambda url: "/road/" in url and "/add/" not in url,
            timeout=15000,
        )
        expect(self.page.get_by_text(entity_name).first).to_be_attached()

    def test_should_also_have_snapping_infrastructure_on_the_edit_page(self):
        self.visit(f"/road/edit/{self.road_id}/")
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )
        self.wait_for_geoman()

        self.page.wait_for_function(
            """() => {
                const map = window.mapentity_map;
                if (!map) return false;
                return Boolean(
                    map.getSource('mapentity-snap-source-road') &&
                    map.getLayer('mapentity-snap-layer-road')
                );
            }""",
            timeout=15000,
        )

    def test_should_not_have_snapping_on_dummymodel_add_page(self):
        self.visit("/dummymodel/add/")
        expect(self.page.locator('.maplibre-map, [id*="map"]').first).to_be_attached(
            timeout=15000
        )
        self.wait_for_geoman()

        has_snap_source = self.page.evaluate(
            """() => {
                const map = window.mapentity_map;
                return Boolean(map && map.getSource('mapentity-snap-source-road'));
            }"""
        )
        self.assertFalse(has_snap_source)
