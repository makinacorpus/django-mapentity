from io import StringIO

from django.core.management import CommandError, call_command
from django.test import TestCase

from mapbox_baselayer.models import BaseLayerTile, MapBaseLayer


class InstallLayerOpenTopoMap(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command(
            "install_layer", "opentopomap", stdout=StringIO(), stderr=StringIO()
        )

    def test_base_layer_is_present(self):
        self.assertTrue(MapBaseLayer.objects.filter(name="OpenTopoMap").exists())

    def test_tile_are_present_and_differents(self):
        tiles = BaseLayerTile.objects.all()
        self.assertEqual(len(tiles), 3)
        self.assertEqual(len(set(tiles.values_list("url", flat=True))), 3)


class InstallLayerOSM(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("install_layer", "osm", stdout=StringIO(), stderr=StringIO())

    def test_base_layer_is_present(self):
        self.assertTrue(MapBaseLayer.objects.filter(name="OSM").exists())

    def test_tile_are_present_and_differents(self):
        tiles = BaseLayerTile.objects.all()
        self.assertEqual(len(tiles), 3)
        self.assertEqual(len(set(tiles.values_list("url", flat=True))), 3)


class InstallLayerIGNNoLayers(TestCase):
    def test_no_layers_lists_available(self):
        out = StringIO()
        call_command("install_layer", "ign", stdout=out, stderr=StringIO())
        output = out.getvalue()
        self.assertIn("Available IGN layers:", output)
        for key in ["plan", "ortho", "maps", "scan_25", "cadastre", "plan_vt"]:
            self.assertIn(key, output)
        self.assertEqual(MapBaseLayer.objects.count(), 0)


class InstallLayerIGNDefault(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command(
            "install_layer", "ign", "ortho", stdout=StringIO(), stderr=StringIO()
        )

    def test_default_creates_ortho(self):
        self.assertTrue(MapBaseLayer.objects.filter(name="Orthophoto IGN").exists())

    def test_default_ortho_is_raster(self):
        layer = MapBaseLayer.objects.get(name="Orthophoto IGN")
        self.assertEqual(layer.base_layer_type, "raster")
        self.assertEqual(layer.tile_size, 256)
        self.assertFalse(layer.is_overlay)

    def test_default_ortho_has_tile(self):
        layer = MapBaseLayer.objects.get(name="Orthophoto IGN")
        tiles = BaseLayerTile.objects.filter(base_layer=layer)
        self.assertEqual(tiles.count(), 1)
        self.assertIn("ORTHOIMAGERY.ORTHOPHOTOS", tiles.first().url)
        self.assertNotIn("apikey", tiles.first().url)


class InstallLayerIGNMultipleLayers(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command(
            "install_layer",
            "ign",
            "ortho",
            "plan",
            "cadastre",
            "plan_vt",
            stdout=StringIO(),
            stderr=StringIO(),
        )

    def test_all_layers_created(self):
        for name in ["Orthophoto IGN", "Plan IGN", "Cadastre IGN", "Plan IGN VT"]:
            self.assertTrue(
                MapBaseLayer.objects.filter(name=name).exists(), f"{name} missing"
            )

    def test_cadastre_is_not_overlay_by_default(self):
        layer = MapBaseLayer.objects.get(name="Cadastre IGN")
        self.assertFalse(layer.is_overlay)

    def test_plan_vt_is_mapbox_style(self):
        layer = MapBaseLayer.objects.get(name="Plan IGN VT")
        self.assertEqual(layer.base_layer_type, "mapbox")
        self.assertEqual(layer.tile_size, 512)
        self.assertIn("vectorTiles", layer.map_box_url)


class InstallLayerIGNWithKey(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command(
            "install_layer",
            "ign",
            "--key",
            "mykey",
            "maps",
            "scan_25",
            stdout=StringIO(),
            stderr=StringIO(),
        )

    def test_layers_with_key_have_apikey(self):
        for name in ["Cartes IGN", "Scan IGN"]:
            layer = MapBaseLayer.objects.get(name=name)
            tile = BaseLayerTile.objects.filter(base_layer=layer).first()
            self.assertIn("apikey=mykey", tile.url)


class InstallLayerIGNInvalidLayer(TestCase):
    def test_invalid_layer_raises_error(self):
        with self.assertRaises(CommandError):
            call_command(
                "install_layer",
                "ign",
                "invalid_layer",
                stdout=StringIO(),
                stderr=StringIO(),
            )


class InstallLayerOSMWithOrder(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command(
            "install_layer", "osm", "--order", "5", stdout=StringIO(), stderr=StringIO()
        )

    def test_osm_order(self):
        layer = MapBaseLayer.objects.get(name="OSM")
        self.assertEqual(layer.order, 5)


class InstallLayerOpenTopoMapWithOrder(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command(
            "install_layer",
            "opentopomap",
            "--order",
            "3",
            stdout=StringIO(),
            stderr=StringIO(),
        )

    def test_opentopomap_order(self):
        layer = MapBaseLayer.objects.get(name="OpenTopoMap")
        self.assertEqual(layer.order, 3)


class InstallLayerIGNWithOrder(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command(
            "install_layer",
            "ign",
            "ortho",
            "--order",
            "7",
            stdout=StringIO(),
            stderr=StringIO(),
        )

    def test_ign_order(self):
        layer = MapBaseLayer.objects.get(name="Orthophoto IGN")
        self.assertEqual(layer.order, 7)


class InstallLayerNoProvider(TestCase):
    def test_no_provider_raises_error(self):
        with self.assertRaises(CommandError):
            call_command(
                "install_layer",
                stdout=StringIO(),
                stderr=StringIO(),
            )


class InstallLayerUnknownProvider(TestCase):
    def test_unknown_provider_raises_error(self):
        from mapbox_baselayer.management.commands.install_layer import Command

        cmd = Command(stdout=StringIO(), stderr=StringIO())
        with self.assertRaises(CommandError) as ctx:
            cmd.handle(provider="unknown_provider")
        self.assertIn("Unknown provider", str(ctx.exception))
