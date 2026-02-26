from dal import autocomplete
import json

from django.contrib.gis.forms.widgets import BaseGeometryWidget
from django.contrib.staticfiles import finders
from django.core import validators
from django.forms import widgets as django_widgets
from django.template.defaultfilters import slugify
from django.template.loader import render_to_string

from .helpers import wkt_to_geom
from .registry import registry
from .settings import API_SRID


def _resolve_custom_icon(icon_value):
    """Resolve a custom_icon value: if it's a static file path, read and return its content."""
    if not icon_value:
        return icon_value
    # If it looks like HTML/SVG content (contains '<'), return as-is
    if "<" in icon_value:
        return icon_value
    # Otherwise treat as a static file path
    path = finders.find(icon_value)
    if path:
        with open(path, "rb") as f:  # Ensure the file is collected and available
            return f.read().decode(
                "utf-8"
            )  # Return the content of the file as a string
    return icon_value


class MapWidget(BaseGeometryWidget):
    """Widget Django pour l'intégration de cartes MapLibre GL JS.

    Ce widget rend un champ de géométrie sous forme de carte interactive
    utilisant MapLibre GL JS avec le plugin Geoman pour le dessin.

    Options (passées via ``attrs`` ou en paramètres nommés) :

    ``geom_type`` (str)
        Type de géométrie OGC (``"POINT"``, ``"LINESTRING"``, ``"POLYGON"``,
        ``"MULTIPOINT"``, ``"MULTILINESTRING"``, ``"MULTIPOLYGON"``,
        ``"GEOMETRYCOLLECTION"``, ``"GEOMETRY"``).  Détermine les outils de
        dessin disponibles.  Par défaut ``"GEOMETRY"`` (tous les outils).

    ``modifiable`` (bool)
        Si ``True`` (par défaut), l'utilisateur peut dessiner et modifier la
        géométrie.  Mis à ``False`` automatiquement lorsque l'utilisateur n'a
        pas la permission ``change_geom``.

    ``target_map`` (str)
        Identifiant d'un autre champ géométrique dont la carte sera
        réutilisée.  Permet d'afficher plusieurs champs géométriques sur
        une même carte.  Exemple : ``"geom"`` pour se brancher sur la carte
        du champ ``geom``.

    ``custom_icon`` (str)
        Icône personnalisée pour les marqueurs de type Point.  Accepte :
        - du contenu SVG/HTML inline (détecté si contient ``<``),
        - un chemin vers un fichier statique (ex. ``"myapp/icons/parking.svg"``).
        Le fichier est lu et son contenu SVG est injecté dans le marqueur.

    ``field_label`` (str)
        Libellé affiché au-dessus des boutons de dessin.  Par défaut, le
        ``verbose_name`` du champ modèle est utilisé.

    ``snapping_config`` (dict ou None)
        Configuration du snapping (accrochage) sur des couches externes.
        Quand défini, le widget charge des couches vectorielles transparentes
        sur la carte et connecte l'API de snapping de Geoman pour que les
        nouveaux sommets s'accrochent aux géométries existantes.

        Structure brute (avec ``layers`` à résoudre) ::

            {
                "enabled": True,
                "layers": ["myapp.Road"],
                "snap_distance": 20,
            }

        Les entrées ``layers`` utilisent la notation ``"app_label.ModelName"``
        (insensible à la casse sur le nom du modèle).  Chaque modèle référencé
        doit être enregistré dans le registre MapEntity.  Le widget résout
        automatiquement ces références en URLs tilejson.

        ``snap_distance`` (défaut : 18) contrôle le rayon en pixels dans lequel
        le snapping est déclenché.

    ``display_raw`` (bool)
        Si ``True``, affiche le textarea brut de la géométrie en plus de la
        carte.  ``False`` par défaut.

    Exemple d'utilisation dans un formulaire ::

        from mapentity.widgets import MapWidget


        class MyForm(MapEntityForm):
            class Meta:
                model = MyModel
                fields = ("name", "geom", "parking")
                widgets = {
                    "geom": MapWidget(
                        geom_type="LINESTRING",
                        attrs={
                            "snapping_config": {
                                "enabled": True,
                                "layers": ["myapp.Road"],
                                "snap_distance": 20,
                            },
                        },
                    ),
                    "parking": MapWidget(
                        attrs={
                            "target_map": "geom",
                            "custom_icon": "myapp/icons/parking.svg",
                        },
                        geom_type="POINT",
                    ),
                }
    """

    template_name = "mapentity/widget.html"
    display_raw = False
    modifiable = True

    def __init__(self, attrs=None, geom_type=None):
        if geom_type:
            attrs = attrs or {}
            attrs["geom_type"] = geom_type
        super().__init__(attrs=attrs)

    def serialize(self, value):
        """
        Sérialise la valeur géométrique en GeoJSON.
        """
        if value:
            if hasattr(value, "transform"):
                value = value.clone()
                value.transform(API_SRID)
            if hasattr(value, "geojson"):
                return value.geojson
            # When form is re-rendered after validation error, value is a raw
            # GeoJSON string from POST data — return it as-is.
            if isinstance(value, str):
                return value
            return ""
        return ""

    def _get_attrs(self, name, attrs=None):
        """
        Prépare les attributs nécessaires pour le rendu du template.
        """
        # Récupération des paramètres depuis l'initialisation du Field
        self.geom_type = self.attrs.get(
            "geom_type", getattr(self, "geom_type", "GEOMETRY")
        )
        attrs = attrs or {}
        # Génération des IDs pour les éléments HTML et JavaScript
        map_id_css = slugify(attrs.get("id", name))
        map_id = map_id_css.replace("-", "_")
        attrs.update(
            {
                "id": map_id,
                "id_css": map_id_css,
                "id_map": map_id_css + "_map",
                "modifiable": self.modifiable,
                "geom_type": self.geom_type,
            }
        )
        # Propager target_map et custom_icon depuis self.attrs vers le contexte du template
        if self.attrs.get("target_map"):
            attrs["target_map"] = self.attrs["target_map"]
        if self.attrs.get("custom_icon"):
            attrs["custom_icon"] = _resolve_custom_icon(self.attrs["custom_icon"])
        if self.attrs.get("field_label"):
            attrs["field_label"] = self.attrs["field_label"]
        if self.attrs.get("snapping_config"):
            attrs["snapping_config"] = json.dumps(
                self._resolve_snapping_config(self.attrs["snapping_config"])
            )
        return attrs

    def _resolve_snapping_config(self, cfg):
        """Resolve a raw snapping_config dict into a JS-ready structure.

        Accepts a config with ``layers`` as ``"app_label.ModelName"`` strings
        and resolves them into ``snapLayers`` entries with ``id`` and
        ``tilejsonUrl`` using the MapEntity registry.

        If the config already contains ``snapLayers``, it is returned as-is
        (already resolved).
        """
        if not cfg or not cfg.get("enabled"):
            return cfg
        # Already resolved (has snapLayers with content)
        if cfg.get("snapLayers"):
            return cfg

        # Build lookup from registry
        model_label_lookup = {}
        for m in registry.registry:
            label_key = f"{m._meta.app_label.lower()}.{m._meta.model_name}"
            model_label_lookup[label_key] = (
                m._meta.model_name,
                m.get_tilejson_url(),
            )

        snap_layers = []
        for label in cfg.get("layers", []):
            key = label.lower()
            entry = model_label_lookup.get(key)
            if entry is None:
                parts = label.split(".", 1)
                if len(parts) == 2:
                    app_l, model_name_l = parts[0].lower(), parts[1].lower()
                    for reg_key, reg_val in model_label_lookup.items():
                        reg_app, reg_model = reg_key.split(".", 1)
                        if reg_app == app_l and reg_model == model_name_l:
                            entry = reg_val
                            break
            if entry:
                snap_layers.append({"id": entry[0], "tilejsonUrl": entry[1]})

        return {
            "enabled": True,
            "snapDistance": cfg.get("snap_distance", 18),
            "snapLayers": snap_layers,
        }

    def get_context(self, name, value, attrs):
        """
        Prépare le contexte pour le rendu du template.
        """
        # Gestion des valeurs vides
        value = None if value in validators.EMPTY_VALUES else value
        # Récupération du contexte parent
        context = super().get_context(name, value, attrs)
        # Ajout des attributs spécifiques au widget
        widget_attrs = self._get_attrs(name, attrs)
        context.update(widget_attrs)
        # Ajout de la valeur sérialisée pour le template
        context["serialized"] = self.serialize(value)
        return context


class HiddenGeometryWidget(django_widgets.HiddenInput):
    def value_from_datadict(self, data, files, name):
        """
        From WKT to Geometry (TODO: should be done in Field clean())
        """
        wkt = super().value_from_datadict(data, files, name)
        return None if not wkt else wkt_to_geom(wkt, silent=True)

    def format_value(self, value):
        """
        Before serialization, reprojects to API_SRID
        """
        if value and not isinstance(value, str):
            value.transform(API_SRID)
        return value


class SelectMultipleWithPop(autocomplete.Select2Multiple):
    def __init__(self, *args, **kwargs):
        self.add_url = kwargs.pop("add_url")
        super().__init__(*args, **kwargs)

    def render(self, name, *args, **kwargs):
        html = super().render(name, *args, **kwargs)
        context = {"field": name, "add_url": self.add_url}
        popupplus = render_to_string("mapentity/popupplus.html", context)
        return html + popupplus
