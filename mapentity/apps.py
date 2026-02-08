from django.apps import AppConfig
from django.conf import settings
from django.core.checks import Warning, register
from django.db.models.signals import post_migrate

from mapentity.signals import migrate_tiles


class MapEntityConfig(AppConfig):
    name = "mapentity"
    verbose_name = "MapEntity"

    def ready(self):
        post_migrate.connect(migrate_tiles, sender=self)


@register()
def old_config(app_configs, **kwargs):
    if hasattr(settings, "LEAFLET_CONFIG"):
        return [
            Warning(
                """Warning: LEAFLET_CONFIG is defined in settings."""
                """If you want to use newest MapEntity version, please make sure to report your LEAFLET_CONFIG to new MAPLIBRE_CONFIG."""
                """TILES and OVERLAYS will be migrate automatically in new database section""",
                id="mapentity.W001",
            )
        ]

    return []
