from unittest import mock

from django.test import TestCase, override_settings

from mapentity.signals import migrate_tiles


class MockBaseLayer:
    """Mock BaseLayer model"""

    def __init__(self):
        self.objects = MockManager()
        self._created = []


class MockManager:
    def __init__(self):
        self._exists = False
        self._created = []

    def exists(self):
        return self._exists

    def create(self, **kwargs):
        obj = mock.MagicMock()
        obj.pk = len(self._created) + 1
        self._created.append(kwargs)
        return obj


class MockBaseLayerTile:
    def __init__(self):
        self.objects = MockManager()


@mock.patch("mapentity.signals.logger")
class MigrateTilesTestCase(TestCase):
    def _make_sender(self, base_layer_exists=False):
        bl = MockBaseLayer()
        bl.objects._exists = base_layer_exists
        blt = MockBaseLayerTile()

        sender = mock.MagicMock()

        def get_model(name):
            if name == "mapbox_baselayer.BaseLayer":
                return bl
            elif name == "mapbox_baselayer.BaseLayerTile":
                return blt
            raise LookupError(name)

        sender.apps.get_model = get_model
        return sender, bl, blt

    def test_no_leaflet_config(self, mock_logger):
        """Should do nothing if LEAFLET_CONFIG not in settings"""

        sender, bl, blt = self._make_sender()
        migrate_tiles(sender)
        self.assertEqual(len(bl.objects._created), 0)

    @override_settings(LEAFLET_CONFIG={"TILES": []})
    def test_empty_tiles(self, mock_logger):
        """Should do nothing with empty TILES list"""
        sender, bl, blt = self._make_sender()
        migrate_tiles(sender)
        self.assertEqual(len(bl.objects._created), 0)

    @override_settings(
        LEAFLET_CONFIG={"TILES": [("OSM", "https://tile.osm.org/{z}/{x}/{y}.png")]}
    )
    def test_simple_tile(self, mock_logger):
        """Should create base layer and tile for simple URL"""
        sender, bl, blt = self._make_sender()
        migrate_tiles(sender)
        self.assertEqual(len(bl.objects._created), 1)
        self.assertEqual(bl.objects._created[0]["name"], "OSM")
        self.assertEqual(bl.objects._created[0]["order"], 0)
        self.assertEqual(len(blt.objects._created), 1)

    @override_settings(
        LEAFLET_CONFIG={"TILES": [("OSM", "https://{s}.tile.osm.org/{z}/{x}/{y}.png")]}
    )
    def test_tile_with_subdomains(self, mock_logger):
        """Should create 3 tiles (a, b, c) when URL contains {s}"""
        sender, bl, blt = self._make_sender()
        migrate_tiles(sender)
        self.assertEqual(len(bl.objects._created), 1)
        self.assertEqual(len(blt.objects._created), 3)
        urls = [t["url"] for t in blt.objects._created]
        self.assertIn("https://a.tile.osm.org/{z}/{x}/{y}.png", urls)
        self.assertIn("https://b.tile.osm.org/{z}/{x}/{y}.png", urls)
        self.assertIn("https://c.tile.osm.org/{z}/{x}/{y}.png", urls)

    @override_settings(
        LEAFLET_CONFIG={
            "TILES": [
                (
                    "OSM",
                    "https://tile.osm.org/{z}/{x}/{y}.png",
                    {"attribution": "© OSM", "maxZoom": 19, "minZoom": 1},
                )
            ]
        }
    )
    def test_tile_with_dict_options(self, mock_logger):
        """Should extract attribution, maxZoom, minZoom from dict options"""
        sender, bl, blt = self._make_sender()
        migrate_tiles(sender)
        created = bl.objects._created[0]
        self.assertEqual(created["attribution"], "© OSM")
        self.assertEqual(created["max_zoom"], 19)
        self.assertEqual(created["min_zoom"], 1)

    @override_settings(
        LEAFLET_CONFIG={
            "TILES": [
                ("OSM", "https://tile.osm.org/{z}/{x}/{y}.png", "© OSM contributors")
            ]
        }
    )
    def test_tile_with_string_attribution(self, mock_logger):
        """Should use string as attribution"""
        sender, bl, blt = self._make_sender()
        migrate_tiles(sender)
        self.assertEqual(bl.objects._created[0]["attribution"], "© OSM contributors")

    @override_settings(
        LEAFLET_CONFIG={"TILES": [("OSM", "https://tile.osm.org/{z}/{x}/{y}.png")]}
    )
    def test_skip_if_layers_exist(self, mock_logger):
        """Should not create layers if BaseLayer already has entries"""
        sender, bl, blt = self._make_sender(base_layer_exists=True)
        migrate_tiles(sender)
        self.assertEqual(len(bl.objects._created), 0)

    @override_settings(
        LEAFLET_CONFIG={
            "TILES": [
                ("A", "https://a.example.com/{z}/{x}/{y}.png"),
                ("B", "https://b.example.com/{z}/{x}/{y}.png"),
            ]
        }
    )
    def test_multiple_tiles(self, mock_logger):
        """Should create multiple base layers with correct order"""
        sender, bl, blt = self._make_sender()
        migrate_tiles(sender)
        self.assertEqual(len(bl.objects._created), 2)
        self.assertEqual(bl.objects._created[0]["order"], 0)
        self.assertEqual(bl.objects._created[1]["order"], 1)

    @override_settings(
        LEAFLET_CONFIG={
            "TILES": [
                ("Valid", "https://example.com/{z}/{x}/{y}.png"),
                "invalid_string",
                ["only_one_element"],
                ("Missing",),
                None,
                ("Another Valid", "https://example2.com/{z}/{x}/{y}.png"),
            ]
        }
    )
    def test_malformed_tiles(self, mock_logger):
        """Should skip malformed tile definitions and log warnings"""
        sender, bl, blt = self._make_sender()
        migrate_tiles(sender)
        # Should only create 2 valid layers (index 0 and 5)
        self.assertEqual(len(bl.objects._created), 2)
        self.assertEqual(bl.objects._created[0]["name"], "Valid")
        self.assertEqual(bl.objects._created[1]["name"], "Another Valid")
        # Should have logged 5 warnings: 4 for invalid entries + 1 for "Created X base layers"
        self.assertEqual(mock_logger.warning.call_count, 5)
