from django.contrib.admin.sites import AdminSite
from django.contrib.auth.models import User
from django.test import RequestFactory, TestCase
from django.urls import reverse

from mapbox_baselayer.admin import BaseLayerRasterAdmin, BaseLayerStyleAdmin
from mapbox_baselayer.models import (
    BaseLayerRaster,
    BaseLayerStyle,
    BaseLayerTile,
    MapBaseLayer,
)
from mapbox_baselayer.views import DEFAULT_OSM_TILEJSON


class EmptyDatabaseTestCase(TestCase):
    def test_baselayer_list_returns_default_osm_entry(self):
        response = self.client.get(reverse("mapbox_baselayer:baselayer-list"))
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("base_layers", data)
        self.assertIn("overlay_layers", data)
        self.assertEqual(len(data["base_layers"]), 1)
        self.assertEqual(len(data["overlay_layers"]), 0)
        osm_entry = data["base_layers"][0]
        self.assertEqual(osm_entry["name"], "OSM")
        self.assertEqual(osm_entry["slug"], "osm")
        self.assertIn("default-osm/tilejson", osm_entry["url"])

    def test_default_osm_tilejson_endpoint(self):
        response = self.client.get(reverse("mapbox_baselayer:default-osm-tilejson"))
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data, DEFAULT_OSM_TILEJSON)
        self.assertIn("osm", data["sources"])
        self.assertEqual(len(data["sources"]["osm"]["tiles"]), 3)


class MapBaseLayerViewTestCase(TestCase):
    def setUp(self) -> None:
        self.raster_base_layer = MapBaseLayer.objects.create(
            name="Raster layer",
            base_layer_type="raster",
            sprite="http://mystyle",
            glyphs="http://mystyle",
        )
        self.tile = BaseLayerTile.objects.create(
            base_layer=self.raster_base_layer, url="http://tiles/{x}/{y]/{z}"
        )
        self.mapbox_base_layer = MapBaseLayer.objects.create(
            name="Mapbox layer",
            order=0,
            base_layer_type="mapbox",
            map_box_url="mapbox://mystyle",
        )

    def test_tilejson_raster(self):
        self.maxDiff = None
        response = self.client.get(
            reverse("mapbox_baselayer:tilejson", args=(self.raster_base_layer.pk,))
        )
        self.assertEqual(response.status_code, 200)
        slug = self.raster_base_layer.slug
        expected = {
            "layers": [
                {
                    "id": f"{slug}-background",
                    "source": slug,
                    "type": "raster",
                }
            ],
            "sources": {
                slug: {
                    "maxzoom": 22,
                    "minzoom": 0,
                    "tiles": ["http://tiles/{x}/{y]/{z}"],
                    "type": "raster",
                    "attribution": "",
                    "tileSize": 512,
                }
            },
            "version": 8,
            "sprite": "http://mystyle",
            "glyphs": "http://mystyle",
        }
        self.assertDictEqual(response.json(), expected)

    def test_tilejson_mapbox(self):
        self.maxDiff = None
        response = self.client.get(
            reverse("mapbox_baselayer:tilejson", args=(self.mapbox_base_layer.pk,))
        )
        self.assertEqual(response.status_code, 404)

    def test_example_view(self):
        response = self.client.get(reverse("example"))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "test_app/map_example.html")
        # Layers are now fetched via JavaScript fetch() call to the API
        self.assertContains(response, "/mapbox-baselayers/")

    def test_baselayer_list_view(self):
        # Add an overlay layer
        MapBaseLayer.objects.create(
            name="Overlay layer", base_layer_type="raster", is_overlay=True, order=1
        )
        response = self.client.get(reverse("mapbox_baselayer:baselayer-list"))
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("base_layers", data)
        self.assertIn("overlay_layers", data)
        self.assertEqual(len(data["base_layers"]), 2)
        self.assertEqual(len(data["overlay_layers"]), 1)
        self.assertEqual(data["overlay_layers"][0]["name"], "Overlay layer")

        # Check ordering
        self.assertEqual(data["base_layers"][0]["name"], "Mapbox layer")  # order=0
        self.assertEqual(
            data["base_layers"][1]["name"], "Raster layer"
        )  # order=0, but 'M' < 'R'


class AdminGetInlinesTestCase(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.raster_admin = BaseLayerRasterAdmin(BaseLayerRaster, AdminSite())
        self.style_admin = BaseLayerStyleAdmin(BaseLayerStyle, AdminSite())
        self.request = self.factory.get("/")
        self.request.user = User.objects.create_superuser("admin", "a@b.com", "pass")

    def test_inlines_for_raster(self):
        layer = MapBaseLayer.objects.create(name="R", base_layer_type="raster")
        inlines = self.raster_admin.get_inline_instances(self.request, obj=layer)
        self.assertEqual(len(inlines), 1)

    def test_no_inlines_for_mapbox(self):
        layer = MapBaseLayer.objects.create(name="M", base_layer_type="mapbox")
        inlines = self.style_admin.get_inline_instances(self.request, obj=layer)
        self.assertEqual(len(inlines), 0)
