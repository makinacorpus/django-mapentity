# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django import forms
from django.core import validators
from django.template.defaultfilters import slugify
from django.core.exceptions import ImproperlyConfigured

from .settings import MAPLIBRE_CONFIG
try:
    from django.contrib.gis.forms.widgets import BaseGeometryWidget
except (ImportError, ImproperlyConfigured):
    from .backport import BaseGeometryWidget

class MaplibreWidget(BaseGeometryWidget):
    template_name = 'mapentity/widget.html'
    map_srid = 4326
    map_width = 600
    map_height = 400
    modifiable = True

    def serialize(self, value):
        return value.geojson if value else ''

    def _get_attrs(self, name, attrs=None):
        assert self.map_srid == 4326, 'Maplibre vectors should be decimal degrees.'

        # Retrieve params from Field init (if any)
        self.geom_type = self.attrs.get('geom_type', self.geom_type)

        attrs = attrs or {}

        if self.geom_type == 'GEOMETRY':
            attrs['geom_type'] = 'Geometry'

        map_id_css = slugify(attrs.get('id', name))  # id need to have - for the inline formset to replace the prefix
        map_id = map_id_css.replace('-', '_')  # JS-safe

        attrs.update(
            id=map_id,
            id_css=map_id_css,
            id_map=map_id_css + '-map',
            id_map_callback=map_id + '_map_callback',
            modifiable=self.modifiable,
            target_map=attrs.get('target_map', getattr(self, 'target_map', None)),
            geometry_field_class='MaplibreMapentityGeometryField'
        )
        return attrs

    def get_context(self, name, value, attrs):
        value = None if value in validators.EMPTY_VALUES else value
        context = super(MaplibreWidget, self).get_context(name, value, attrs)
        context.update(self._get_attrs(name, attrs))
        return context
