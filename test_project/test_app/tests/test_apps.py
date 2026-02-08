from django.core.checks import Warning
from django.test import TestCase, override_settings

from mapentity.apps import old_config


class OldConfigCheckTestCase(TestCase):
    @override_settings()
    def test_no_warning_without_leaflet_config(self):
        """No warning when LEAFLET_CONFIG is not defined"""
        from django.conf import settings

        if hasattr(settings, "LEAFLET_CONFIG"):
            delattr(settings, "LEAFLET_CONFIG")
        result = old_config(None)
        self.assertEqual(result, [])

    @override_settings(LEAFLET_CONFIG={"TILES": []})
    def test_warning_with_leaflet_config(self):
        """Warning when LEAFLET_CONFIG is defined"""
        result = old_config(None)
        self.assertEqual(len(result), 1)
        self.assertIsInstance(result[0], Warning)
        self.assertEqual(result[0].id, "mapentity.W001")
        self.assertIn("LEAFLET_CONFIG", result[0].msg)
        self.assertIn("MAPLIBRE_CONFIG", result[0].msg)
