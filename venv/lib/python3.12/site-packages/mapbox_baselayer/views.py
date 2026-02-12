from django.http import JsonResponse
from django.urls import reverse
from django.views import View
from django.views.generic.detail import BaseDetailView

from mapbox_baselayer import models


class MapboxBaseLayerJsonDetailView(BaseDetailView):
    queryset = models.MapBaseLayer.objects.exclude(
        base_layer_type="mapbox"
    )  # mapbox provide its own json

    def get(self, request, *args, **kwargs):
        return JsonResponse(self.get_object().tilejson)


DEFAULT_OSM_TILEJSON = {
    "version": 8,
    "sources": {
        "osm": {
            "type": "raster",
            "tiles": [
                "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
                "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
                "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
            ],
            "minzoom": 0,
            "maxzoom": 19,
            "tileSize": 256,
            "attribution": '<a href="https://www.openstreetmap.org/copyright">OSM Contributors</a>',
        }
    },
    "layers": [
        {
            "id": "osm-background",
            "type": "raster",
            "source": "osm",
        }
    ],
    "glyphs": "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
}


class DefaultOSMTileJsonView(View):
    def get(self, request, *args, **kwargs):
        return JsonResponse(DEFAULT_OSM_TILEJSON)


class MapLayerListView(View):
    def get(self, request, *args, **kwargs):
        layers = models.MapBaseLayer.objects.filter(enabled=True)
        base_layers = layers.filter(is_overlay=False)
        overlay_layers = layers.filter(is_overlay=True)

        data = {
            "base_layers": [
                {"name": bl.name, "slug": bl.slug, "url": bl.url} for bl in base_layers
            ]
            if base_layers.filter(enabled=True).exists()
            else [
                {
                    "name": "OSM",
                    "slug": "osm",
                    "url": reverse("mapbox_baselayer:default-osm-tilejson"),
                }
            ],
            "overlay_layers": [
                {"name": ol.name, "slug": ol.slug, "url": ol.url}
                for ol in overlay_layers
            ],
        }
        return JsonResponse(data)
