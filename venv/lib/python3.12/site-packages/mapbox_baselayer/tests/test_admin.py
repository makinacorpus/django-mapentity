from django.contrib.admin.sites import AdminSite
from django.test import RequestFactory, TestCase

from mapbox_baselayer.admin import (
    LayerAdmin,
    RasterForm,
    StyleForm,
)
from mapbox_baselayer.models import MapBaseLayer


class RasterFormTestCase(TestCase):
    def test_tile_size_initial_is_256(self):
        form = RasterForm()
        self.assertEqual(form.fields["tile_size"].initial, 256)


class StyleFormTestCase(TestCase):
    def test_map_box_url_required(self):
        form = StyleForm()
        self.assertTrue(form.fields["map_box_url"].required)


class LayerAdminTestCase(TestCase):
    def setUp(self):
        self.site = AdminSite()
        self.admin = LayerAdmin(MapBaseLayer, self.site)
        self.factory = RequestFactory()
        self.request = self.factory.get("/admin/")

    def test_get_queryset_filters_enabled(self):
        enabled = MapBaseLayer.objects.create(
            name="Enabled", base_layer_type="raster", enabled=True
        )
        MapBaseLayer.objects.create(
            name="Disabled", base_layer_type="raster", enabled=False
        )
        qs = self.admin.get_queryset(self.request)
        self.assertEqual(list(qs), [enabled])

    def test_has_add_permission_false(self):
        self.assertFalse(self.admin.has_add_permission(self.request))

    def test_has_delete_permission_false(self):
        self.assertFalse(self.admin.has_delete_permission(self.request))

    def test_has_change_permission_false(self):
        self.assertFalse(self.admin.has_change_permission(self.request))
