import logging

from django.conf import settings

logger = logging.getLogger(__name__)


def migrate_tiles(sender, **kwargs):
    BaseLayer = sender.apps.get_model("mapbox_baselayer.BaseLayer")
    BaseLayerTile = sender.apps.get_model("mapbox_baselayer.BaseLayerTile")

    if not BaseLayer.objects.exists():
        if hasattr(settings, "LEAFLET_CONFIG"):
            # migrate tiles from old LEAFLET_CONFIG setting
            tiles = settings.LEAFLET_CONFIG.get("TILES", [])

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

                b = BaseLayer.objects.create(**options)
                if "{s}" in url:
                    # If the URL contains "{s}", we need to create a tile for each subdomain (a, b, c)
                    tile_urls = [url.replace("{s}", s) for s in "abc"]
                else:
                    tile_urls = [url]
                for tile_url in tile_urls:
                    BaseLayerTile.objects.create(
                        base_layer=b,
                        url=tile_url,
                    )
            logger.warning(
                "Created %s base layers from LEAFLET_CONFIG TILES.", len(tiles)
            )
