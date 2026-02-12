from django.test import TestCase
from django.urls import reverse

from mapbox_baselayer.models import BaseLayer, BaseLayerTile, MapBaseLayer, OverlayLayer


class MapBaseLayerTEstCase(TestCase):
    def setUp(self):
        self.mapbox_base_layer = MapBaseLayer.objects.create(
            name="Base layer 1",
            order=0,
            base_layer_type="mapbox",
            map_box_url="mapbox://mystyle",
            sprite="mapbox://mystyle",
            glyphs="mapbox://mystyle",
        )
        self.raster_base_layer = MapBaseLayer.objects.create(
            name="Raster layer",
            base_layer_type="raster",
            sprite="http://mystyle",
            glyphs="http://mystyle",
        )

    def test_str(self):
        self.assertEqual(self.mapbox_base_layer.name, str(self.mapbox_base_layer))

    def test_mapbox_url(self):
        self.assertEqual(self.mapbox_base_layer.url, self.mapbox_base_layer.map_box_url)

    def test_raster_url(self):
        self.assertEqual(
            self.raster_base_layer.url,
            reverse("mapbox_baselayer:tilejson", args=(self.raster_base_layer.pk,)),
        )

    def test_ordering(self):
        MapBaseLayer.objects.all().delete()
        layer_c = MapBaseLayer.objects.create(
            name="C", order=2, base_layer_type="mapbox"
        )
        layer_a2 = MapBaseLayer.objects.create(
            name="A2", order=1, base_layer_type="mapbox"
        )
        layer_a1 = MapBaseLayer.objects.create(
            name="A1", order=1, base_layer_type="mapbox"
        )
        layer_b = MapBaseLayer.objects.create(
            name="B", order=1, base_layer_type="mapbox"
        )

        layers = list(MapBaseLayer.objects.all())
        self.assertEqual(layers, [layer_a1, layer_a2, layer_b, layer_c])


class ProxyModelsTestCase(TestCase):
    def setUp(self):
        MapBaseLayer.objects.all().delete()

    def test_base_layer_proxy_sets_is_overlay_false(self):
        layer = BaseLayer.objects.create(
            name="Test Base Layer", base_layer_type="raster"
        )
        self.assertFalse(layer.is_overlay)
        # Verify it's also False in the database
        layer.refresh_from_db()
        self.assertFalse(layer.is_overlay)

    def test_overlay_layer_proxy_sets_is_overlay_true(self):
        layer = OverlayLayer.objects.create(
            name="Test Overlay Layer", base_layer_type="raster"
        )
        self.assertTrue(layer.is_overlay)
        # Verify it's also True in the database
        layer.refresh_from_db()
        self.assertTrue(layer.is_overlay)

    def test_base_layer_manager_filters_correctly(self):
        BaseLayer.objects.create(name="Base 1", base_layer_type="raster")
        BaseLayer.objects.create(name="Base 2", base_layer_type="raster")
        OverlayLayer.objects.create(name="Overlay 1", base_layer_type="raster")

        self.assertEqual(BaseLayer.objects.count(), 2)
        self.assertEqual(OverlayLayer.objects.count(), 1)
        self.assertEqual(MapBaseLayer.objects.count(), 3)

    def test_proxy_models_share_same_table(self):
        base = BaseLayer.objects.create(name="Base Layer", base_layer_type="raster")
        overlay = OverlayLayer.objects.create(
            name="Overlay Layer", base_layer_type="raster"
        )

        # Both should be accessible via MapBaseLayer
        all_layers = MapBaseLayer.objects.all()
        self.assertEqual(all_layers.count(), 2)
        self.assertIn(base.pk, all_layers.values_list("pk", flat=True))
        self.assertIn(overlay.pk, all_layers.values_list("pk", flat=True))


class RealUrlTestCase(TestCase):
    def test_real_url_raster(self):
        layer = MapBaseLayer.objects.create(name="Raster", base_layer_type="raster")
        self.assertEqual(layer.real_url, layer.url)

    def test_real_url_mapbox(self):
        layer = MapBaseLayer.objects.create(
            name="Mapbox",
            base_layer_type="mapbox",
            map_box_url="mapbox://styles/user/style",
        )
        self.assertEqual(
            layer.real_url,
            "https://api.mapbox.com/styles/v1/user/style",
        )

    def test_real_url_vector(self):
        layer = MapBaseLayer.objects.create(
            name="Vector",
            base_layer_type="vector",
            map_box_url="mapbox://styles/user/vstyle",
        )
        self.assertEqual(
            layer.real_url,
            "https://api.mapbox.com/styles/v1/user/vstyle",
        )


class BaseLayerTileStrTestCase(TestCase):
    def test_str(self):
        layer = MapBaseLayer.objects.create(name="Test", base_layer_type="raster")
        tile = BaseLayerTile.objects.create(
            base_layer=layer, url="http://example.com/{z}/{x}/{y}.png"
        )
        self.assertEqual(str(tile), "Test - http://example.com/{z}/{x}/{y}.png")
