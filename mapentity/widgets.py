import json

from dal import autocomplete
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
    """Django Widget for MapLibre GL JS map integration.

    This widget renders a geometry field as an interactive map
    using MapLibre GL JS with the Geoman plugin for drawing.

    Options (passed via ``attrs`` or as named parameters) :

    ``geom_type`` (str)
        OGC geometry type (``"POINT"``, ``"LINESTRING"``, ``"POLYGON"``,
        ``"MULTIPOINT"``, ``"MULTILINESTRING"``, ``"MULTIPOLYGON"``,
        ``"GEOMETRYCOLLECTION"``, ``"GEOMETRY"``).
        Determines the default geometry type. Default is ``"GEOMETRY"``.

    ``allowed_types`` (list/tuple of str)
        List of OGC geometry types (e.g. ``["POINT", "LINESTRING"]``) that
        are allowed for drawing. Used to restrict available drawing controls on
        generic geometry fields (such as fields with type ``"GEOMETRY"``).

    ``modifiable`` (bool)
        If ``True`` (default), the user can draw and modify the geometry.
        Automatically set to ``False`` when the user does not have the
        ``change_geom`` permission.

    ``target_map`` (str)
        Identifier of another geometry field whose map will be reused.
        Allows displaying multiple geometry fields on the same map.
        Example: ``"geom"`` to hook into the map of the ``geom`` field.

    ``custom_icon`` (str)
        Custom icon for Point markers. Accepts:
        - inline SVG/HTML content (detected if it contains ``<``),
        - a path to a static file (e.g., ``"myapp/icons/parking.svg"``).
        The file is read, and its SVG content is injected into the marker.

    ``field_label`` (str)
        Label displayed above the drawing buttons.  By default, the
        ``verbose_name`` of the model field is used.

    ``snapping_config`` (dict or None)
        Configuration for snapping to external layers.
        When defined, the widget loads transparent vector layers
        on the map and connects the Geoman snapping API so that new
        vertices snap to existing geometries.

        Raw structure (with ``layers`` to resolve) ::

            {
                "enabled": True,
                "layers": ["myapp.Road"],
                "snap_distance": 20,
            }

        The ``layers`` entries use the ``"app_label.ModelName"`` notation
        (case-insensitive on the model name).  Each referenced model must be
        registered in the MapEntity registry.  The widget automatically resolves
        these references to tilejson URLs.

        ``snap_distance`` (default: 18) controls the radius in pixels within which
        snapping is triggered.

        ``display_raw`` (bool)
            If ``True``, displays the raw geometry textarea in addition to the
            map.  ``False`` by default.

    Example usage in a form ::

        from mapentity.widgets import MapWidget


        class MyForm(MapEntityForm):
            class Meta:
                model = MyModel
                fields = ("name", "geom", "parking")
                widgets = {
                    "geom": MapWidget(
                        geom_type="GEOMETRY",
                        allowed_types=["POINT", "LINESTRING"],
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

    def __init__(self, attrs=None, geom_type=None, allowed_types=None):
        self.allowed_types = allowed_types
        if attrs and "allowed_types" in attrs:
            self.allowed_types = attrs["allowed_types"]

        # Support backward compatibility for geom_type passed as list/tuple
        if isinstance(geom_type, (list, tuple)):
            self.allowed_types = geom_type
            geom_type = "GEOMETRY"

        if attrs and isinstance(attrs.get("geom_type"), (list, tuple)):
            self.allowed_types = attrs["geom_type"]
            attrs = attrs.copy()
            attrs["geom_type"] = "GEOMETRY"

        self.custom_geom_type = geom_type
        if attrs and "geom_type" in attrs:
            self.custom_geom_type = attrs["geom_type"]
        if geom_type:
            attrs = attrs or {}
            attrs["geom_type"] = geom_type
        super().__init__(attrs=attrs)

    def serialize(self, value):
        """
        Serialize geometric value to GeoJSON
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
        Prepare required attributes for the template.
        """
        # Retrieve parameters from the Field initialization
        geom_type = self.attrs.get("geom_type", getattr(self, "geom_type", "GEOMETRY"))
        if isinstance(geom_type, (list, tuple)):
            self.geom_type = "GEOMETRY"
            self.allowed_types = [gt.upper() for gt in geom_type]
        else:
            self.geom_type = geom_type.upper()

        allowed_types = self.attrs.get(
            "allowed_types", getattr(self, "allowed_types", None)
        )
        if allowed_types:
            self.allowed_types = [t.upper() for t in allowed_types]
        else:
            self.allowed_types = None

        attrs = attrs or {}
        # Generate IDs for HTML and JavaScript elements
        map_id_css = slugify(attrs.get("id", name))
        map_id = map_id_css.replace("-", "_")
        attrs.update(
            {
                "id": map_id,
                "id_css": map_id_css,
                "id_map": map_id_css + "_map",
                "modifiable": self.modifiable,
                "geom_type": self.geom_type,
                "geom_type_json": json.dumps(self.geom_type),
            }
        )
        if self.allowed_types:
            attrs["allowed_types"] = self.allowed_types
            attrs["allowed_types_json"] = json.dumps(self.allowed_types)

        # Propagate target_map and custom_icon from self.attrs to the template context
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
        Prepare the context for template rendering.
        """
        # Handle empty values
        value = None if value in validators.EMPTY_VALUES else value
        # Retrieve parent context
        context = super().get_context(name, value, attrs)
        # Add widget-specific attributes
        widget_attrs = self._get_attrs(name, attrs)
        context.update(widget_attrs)
        # Add serialized value for the template
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
