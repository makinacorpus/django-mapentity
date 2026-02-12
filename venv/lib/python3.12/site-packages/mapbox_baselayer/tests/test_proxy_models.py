from django.test import TestCase

from mapbox_baselayer.models import (
    BaseLayerRaster,
    BaseLayerStyle,
    MapBaseLayer,
    OverlayRaster,
    OverlayStyle,
)


class BaseLayerRasterTestCase(TestCase):
    def test_save_sets_fields(self):
        layer = BaseLayerRaster.objects.create(
            name="Raster Base", base_layer_type="mapbox"
        )
        layer.refresh_from_db()
        self.assertFalse(layer.is_overlay)
        self.assertEqual(layer.base_layer_type, MapBaseLayer.LayerType.RASTER)

    def test_manager_filters(self):
        BaseLayerRaster.objects.create(name="R1", base_layer_type="raster")
        OverlayRaster.objects.create(name="OR1", base_layer_type="raster")
        self.assertEqual(BaseLayerRaster.objects.count(), 1)


class BaseLayerStyleTestCase(TestCase):
    def test_save_sets_fields(self):
        layer = BaseLayerStyle.objects.create(
            name="Style Base", base_layer_type="raster"
        )
        layer.refresh_from_db()
        self.assertFalse(layer.is_overlay)
        self.assertEqual(layer.base_layer_type, MapBaseLayer.LayerType.STYLE_URL)

    def test_manager_filters(self):
        BaseLayerStyle.objects.create(name="S1", base_layer_type="raster")
        OverlayStyle.objects.create(name="OS1", base_layer_type="raster")
        self.assertEqual(BaseLayerStyle.objects.count(), 1)


class OverlayRasterTestCase(TestCase):
    def test_save_sets_fields(self):
        layer = OverlayRaster.objects.create(
            name="Raster Overlay", base_layer_type="mapbox"
        )
        layer.refresh_from_db()
        self.assertTrue(layer.is_overlay)
        self.assertEqual(layer.base_layer_type, MapBaseLayer.LayerType.RASTER)

    def test_manager_filters(self):
        OverlayRaster.objects.create(name="OR1", base_layer_type="raster")
        BaseLayerRaster.objects.create(name="R1", base_layer_type="raster")
        self.assertEqual(OverlayRaster.objects.count(), 1)


class OverlayStyleTestCase(TestCase):
    def test_save_sets_fields(self):
        layer = OverlayStyle.objects.create(
            name="Style Overlay", base_layer_type="raster"
        )
        layer.refresh_from_db()
        self.assertTrue(layer.is_overlay)
        self.assertEqual(layer.base_layer_type, MapBaseLayer.LayerType.STYLE_URL)

    def test_manager_filters(self):
        OverlayStyle.objects.create(name="OS1", base_layer_type="raster")
        BaseLayerStyle.objects.create(name="S1", base_layer_type="raster")
        self.assertEqual(OverlayStyle.objects.count(), 1)
