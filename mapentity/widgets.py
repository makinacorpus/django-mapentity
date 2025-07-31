from django.forms import widgets as django_widgets
from django.template.loader import render_to_string
from .helpers import wkt_to_geom
from .settings import API_SRID
from django.core import validators
from django.template.defaultfilters import slugify
from django.contrib.gis.forms.widgets import BaseGeometryWidget

class MapWidget(BaseGeometryWidget):
    """
    Widget Django pour l'intégration de cartes MapLibre GL JS.
    """
    template_name = 'mapentity/widget.html'
    display_raw = False
    modifiable = True

    def serialize(self, value):
        """
        Sérialise la valeur géométrique en GeoJSON.
        """
        return value.geojson if value else ''

    def _get_attrs(self, name, attrs=None):
        """
        Prépare les attributs nécessaires pour le rendu du template.
        """
        # Récupération des paramètres depuis l'initialisation du Field
        self.geom_type = self.attrs.get('geom_type', getattr(self, 'geom_type', 'GEOMETRY'))
        attrs = attrs or {}
        # Normalisation du type de géométrie
        if self.geom_type == 'GEOMETRY':
            attrs['geom_type'] = 'Geometry'
        else:
            attrs['geom_type'] = self.geom_type
        # Génération des IDs pour les éléments HTML et JavaScript
        map_id_css = slugify(attrs.get('id', name))
        map_id = map_id_css.replace('-', '_')
        attrs.update({
            'id': map_id,
            'id_css': map_id_css,
            'id_map': map_id_css + '_map',
            'modifiable': self.modifiable,
            'target_map': attrs.get('target_map', getattr(self, 'target_map', None)),
        })
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
        context['serialized'] = self.serialize(value)
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
        self.add_url = kwargs.pop('add_url')
        super().__init__(*args, **kwargs)

    def render(self, name, *args, **kwargs):
        html = super().render(name, *args, **kwargs)
        context = {'field': name, 'add_url': self.add_url}
        popupplus = render_to_string("mapentity/popupplus.html", context)
        return html + popupplus
