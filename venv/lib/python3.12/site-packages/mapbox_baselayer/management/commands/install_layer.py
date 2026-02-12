from urllib.parse import urlencode

from django.core.management import BaseCommand, CommandError

from mapbox_baselayer.models import BaseLayerTile, MapBaseLayer


class Command(BaseCommand):
    help = "Install base layers (subcommands: ign, osm, opentopomap)"

    def add_arguments(self, parser):
        subparsers = parser.add_subparsers(dest="provider", help="Layer provider")

        # IGN subcommand
        ign_parser = subparsers.add_parser("ign", help="Install IGN base layers")
        ign_parser.add_argument("--key", type=str, default="ign_scan_ws")
        ign_parser.add_argument(
            "--order", type=int, default=0, help="Order of the base layer"
        )
        ign_parser.add_argument(
            "--overlay",
            action="store_true",
            help="Install layers as overlay",
            default=False,
        )
        ign_parser.add_argument(
            "layers",
            nargs="*",
            type=str,
            default=[],
        )

        # OSM subcommand
        osm_parser = subparsers.add_parser("osm", help="Install OSM base layer")
        osm_parser.add_argument(
            "--order", type=int, default=0, help="Order of the base layer"
        )

        # OpenTopoMap subcommand
        otm_parser = subparsers.add_parser(
            "opentopomap", help="Install OpenTopoMap base layer"
        )
        otm_parser.add_argument(
            "--order", type=int, default=0, help="Order of the base layer"
        )

    # IGN layer definitions
    raster_layers = {
        "plan": {
            "label": "Plan IGN",
            "name": "GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2",
            "format": "png",
            "need_key": False,
        },
        "ortho": {
            "label": "Orthophoto IGN",
            "name": "ORTHOIMAGERY.ORTHOPHOTOS",
            "format": "jpeg",
            "need_key": False,
        },
        "maps": {
            "label": "Cartes IGN",
            "name": "GEOGRAPHICALGRIDSYSTEMS.MAPS",
            "format": "jpeg",
            "need_key": True,
        },
        "scan_25": {
            "label": "Scan IGN",
            "name": "GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN25TOUR",
            "format": "jpeg",
            "need_key": True,
        },
        "cadastre": {
            "label": "Cadastre IGN",
            "name": "CADASTRALPARCELS.PARCELLAIRE_EXPRESS",
            "format": "png",
            "need_key": False,
        },
    }
    mapbox_style_layers = {
        "plan_vt": {
            "label": "Plan IGN VT",
            "url": "https://data.geopf.fr/annexes/ressources/vectorTiles/styles/PLAN.IGN/standard.json",
        },
        "scan_25_vt": {
            "label": "Scan IGN VT",
            "url": "https://data.geopf.fr/annexes/ressources/vectorTiles/styles/PLAN.IGN/classique.json",
        },
        "gris_vt": {
            "label": "Gris IGN VT",
            "url": "https://data.geopf.fr/annexes/ressources/vectorTiles/styles/PLAN.IGN/gris.json",
        },
        "cadastre_vt": {
            "label": "Cadastre IGN VT",
            "url": "https://data.geopf.fr/annexes/ressources/vectorTiles/styles/PCI/pci.json",
        },
    }

    def handle(self, *args, **options):
        provider = options.get("provider")
        if not provider:
            msg = "You must specify a provider: ign, osm, or opentopomap"
            raise CommandError(msg)

        handler = getattr(self, f"handle_{provider.replace('-', '_')}", None)
        if handler is None:
            msg = f"Unknown provider: {provider}"
            raise CommandError(msg)
        handler(**options)

    def handle_ign(self, **options):
        key = options.get("key")
        overlay = options.get("overlay")
        order = options.get("order")
        layers = options.get("layers", [])

        if not layers:
            all_layers = list(self.raster_layers.keys()) + list(
                self.mapbox_style_layers.keys()
            )
            self.stdout.write("Available IGN layers:")
            for name in all_layers:
                if name in self.raster_layers:
                    label = self.raster_layers[name]["label"]
                    layer_type = "raster"
                else:
                    label = self.mapbox_style_layers[name]["label"]
                    layer_type = "mapbox style"
                self.stdout.write(f"  - {name}: {label} ({layer_type})")
            return

        for layer in layers:
            if (
                layer not in self.raster_layers
                and layer not in self.mapbox_style_layers
            ):
                valid_layers = list(self.raster_layers.keys()) + list(
                    self.mapbox_style_layers.keys()
                )
                msg = f"'{layer}' is not a valid value. Should be '{', '.join(valid_layers)}'"
                raise CommandError(msg)

        for layer in layers:
            if layer in self.raster_layers:
                params = {
                    "LAYER": self.raster_layers[layer]["name"],
                    "EXCEPTIONS": "text/xml",
                    "FORMAT": f"image/{self.raster_layers[layer]['format']}",
                    "SERVICE": "WMTS",
                    "VERSION": "1.0.0",
                    "REQUEST": "GetTile",
                    "STYLE": "normal",
                    "TILEMATRIXSET": "PM",
                }
                if self.raster_layers[layer]["need_key"]:
                    params["apikey"] = key
                base_url = f"https://data.geopf.fr/{'private/' if self.raster_layers[layer]['need_key'] else ''}wmts"

                query_string = urlencode(params)
                final_url = f"{base_url}?{query_string}&TILEMATRIX={{z}}&TILEROW={{y}}&TILECOL={{x}}"

                base_layer = MapBaseLayer.objects.create(
                    name=self.raster_layers[layer]["label"],
                    base_layer_type="raster",
                    tile_size=256,
                    is_overlay=overlay,
                    min_zoom=0,
                    max_zoom=19,
                    attribution="© IGN - GeoPortail",
                    order=order,
                )
                BaseLayerTile.objects.bulk_create(
                    [
                        BaseLayerTile(base_layer=base_layer, url=final_url),
                    ]
                )

            elif layer in self.mapbox_style_layers:
                style = self.mapbox_style_layers[layer]
                MapBaseLayer.objects.create(
                    name=style["label"],
                    base_layer_type="mapbox",
                    tile_size=512,
                    is_overlay=overlay,
                    attribution="© IGN - GeoPortail",
                    map_box_url=style["url"],
                    order=order,
                )
        self.stdout.write(self.style.SUCCESS("IGN layer(s) created."))

    def handle_osm(self, **options):
        order = options.get("order", 0)
        base_layer = MapBaseLayer.objects.create(
            name="OSM",
            base_layer_type="raster",
            tile_size=256,
            min_zoom=0,
            max_zoom=19,
            attribution='<a href="https://www.openstreetmap.org/copyright">OSM Contributors</a>',
            order=order,
        )
        BaseLayerTile.objects.bulk_create(
            [
                BaseLayerTile(
                    base_layer=base_layer,
                    url="https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
                ),
                BaseLayerTile(
                    base_layer=base_layer,
                    url="https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
                ),
                BaseLayerTile(
                    base_layer=base_layer,
                    url="https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
                ),
            ]
        )
        self.stdout.write(self.style.SUCCESS("OSM base layer has been created."))

    def handle_opentopomap(self, **options):
        order = options.get("order", 0)
        base_layer = MapBaseLayer.objects.create(
            name="OpenTopoMap",
            base_layer_type="raster",
            tile_size=256,
            min_zoom=2,
            max_zoom=17,
            order=order,
            attribution='map data: © <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors,'
            '<a href="http://viewfinderpanoramas.org">SRTM</a> | map style: © '
            '<a href="https://opentopomap.org">OpenTopoMap</a> '
            '(<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
        )
        BaseLayerTile.objects.bulk_create(
            [
                BaseLayerTile(
                    base_layer=base_layer,
                    url="https://a.tile.opentopomap.org/{z}/{x}/{y}.png",
                ),
                BaseLayerTile(
                    base_layer=base_layer,
                    url="https://b.tile.opentopomap.org/{z}/{x}/{y}.png",
                ),
                BaseLayerTile(
                    base_layer=base_layer,
                    url="https://c.tile.opentopomap.org/{z}/{x}/{y}.png",
                ),
            ]
        )
        self.stdout.write(
            self.style.SUCCESS("OpenTopoMap base layer has been created.")
        )
