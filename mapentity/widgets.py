from django.contrib.gis.forms.widgets import BaseGeometryWidget
from django.contrib.staticfiles import finders
from django.core import validators
from django.forms import widgets as django_widgets
from django.template.defaultfilters import slugify
from django.template.loader import render_to_string

from .helpers import wkt_to_geom
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
            return f.read().decode("utf-8")  # Return the content of the file as a string
    return icon_value


class MapWidget(BaseGeometryWidget):
    """
    Widget Django pour l'intégration de cartes MapLibre GL JS.
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
        return attrs

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


class SelectMultipleWithPop(django_widgets.SelectMultiple):
    def __init__(self, *args, **kwargs):
        self.add_url = kwargs.pop("add_url")
        super().__init__(*args, **kwargs)

    def render(self, name, *args, **kwargs):
        html = super().render(name, *args, **kwargs)
        context = {"field": name, "add_url": self.add_url}
        popupplus = render_to_string("mapentity/popupplus.html", context)
        return html + popupplus
