from django.conf import settings
from django.core.checks import Warning, register


@register()
def check_old_config(app_configs, **kwargs):
    if hasattr(settings, "LEAFLET_CONFIG"):
        old_leaflet_config = getattr(settings, "LEAFLET_CONFIG", None)
        if old_leaflet_config:
            return [
                Warning(
                    "LEAFLET_CONFIG is defined in settings. "
                    "To use the latest MapEntity version, please port your LEAFLET_CONFIG to the new MAPLIBRE_CONFIG. "
                    "TILES and OVERLAYS will be migrated automatically to the database.",
                    id="mapentity.W001",
                )
            ]

    return []
