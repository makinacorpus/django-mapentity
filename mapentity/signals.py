import logging

from django.conf import settings

logger = logging.getLogger(__name__)


def migrate_tiles(sender, **kwargs):
    apps = kwargs.get("apps")
    if apps is None:
        if hasattr(sender, "apps"):
            apps = sender.apps
        else:
            from django.apps import apps as global_apps

            apps = global_apps
    MapBaseLayer = apps.get_model("mapbox_baselayer.MapBaseLayer")
    BaseLayerTile = apps.get_model("mapbox_baselayer.BaseLayerTile")

    def _create_layers(tiles, overlay=False):
        created_count = 0
        for idx, element in enumerate(tiles):
            name = element[0]
            url = element[1]
            options = {
                "name": name,
                "base_layer_type": "raster",
                "tile_size": 256,
                "order": idx,
            }

            if len(element) > 2:
                if isinstance(element[2], dict):
                    if "attribution" in element[2]:
                        options["attribution"] = element[2]["attribution"]
                    if "maxZoom" in element[2]:
                        options["max_zoom"] = element[2]["maxZoom"]
                    if "minZoom" in element[2]:
                        options["min_zoom"] = element[2]["minZoom"]
                elif isinstance(element[2], str):
                    options["attribution"] = element[2]

            name = options.pop("name")
            b, created = MapBaseLayer.objects.get_or_create(
                name=name, is_overlay=overlay, defaults=options
            )
            if created:
                created_count += 1
                if "{s}" in url:
                    # If the URL contains "{s}", we need to create a tile for each subdomain (a, b, c)
                    tile_urls = [url.replace("{s}", s) for s in "abc"]
                else:
                    tile_urls = [url]
                for tile_url in tile_urls:
                    if tile_url.startswith("//"):
                        # define real url if no scheme is defined
                        tile_url = f"https:{tile_url}"
                    BaseLayerTile.objects.create(
                        base_layer=b,
                        url=tile_url,
                    )
            if overlay:
                logger.warning(
                    "Created %s overlay layers from LEAFLET_CONFIG OVERLAYS.",
                    created_count,
                )
            else:
                logger.warning(
                    "Created %s base layers from LEAFLET_CONFIG TILES.", created_count
                )

    if hasattr(settings, "LEAFLET_CONFIG"):
        # migrate tiles from old LEAFLET_CONFIG setting
        base_tiles = settings.LEAFLET_CONFIG.get("TILES", [])
        overlays = settings.LEAFLET_CONFIG.get("OVERLAYS", [])
        if base_tiles:
            _create_layers(base_tiles, overlay=False)
        if overlays:
            _create_layers(overlays, overlay=True)
