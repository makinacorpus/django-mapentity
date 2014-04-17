import re
import logging
import inspect
from collections import namedtuple, OrderedDict

from django.conf import settings
from django.utils.importlib import import_module
from django.views.generic.base import View
from django.conf.urls import patterns


__all__ = ['app_settings', 'registry', 'logger']

logger = logging.getLogger(__name__)

API_SRID = 4326

app_settings = dict({
    'TITLE': "",
    'HISTORY_ITEMS_MAX': 5,
    'CONVERSION_SERVER': 'http://convertit/',
    'CAPTURE_SERVER': 'http://screamshotter/',
    'INTERNAL_USER': '__internal__',
    'JS_SETTINGS_VIEW': 'mapentity:js_settings',
    'ROOT_URL': '',
    'LANGUAGES': settings.LANGUAGES,
    'TRANSLATED_LANGUAGES': settings.LANGUAGES,
    'LANGUAGE_CODE': settings.LANGUAGE_CODE,
    'TEMP_DIR': getattr(settings, 'TEMP_DIR', '/tmp'),
    'MAP_CAPTURE_SIZE': 800,
    'MAP_CAPTURE_MAX_RATIO': 1.25,
    'GEOM_FIELD_NAME': 'geom',
    'MAP_BACKGROUND_FOGGED': False,
    'ACTION_HISTORY_ENABLED': True,
    'ACTION_HISTORY_LENGTH': 20,
    'ANONYMOUS_VIEWS_PERMS': tuple(),
    'GEOJSON_LAYERS_CACHE_BACKEND': 'default'
}, **getattr(settings, 'MAPENTITY_CONFIG', {}))


TINYMCE_DEFAULT_CONFIG = {
    'theme': 'advanced',
    'theme_advanced_buttons1': 'bold,italic,forecolor,separator,bullist,numlist,link,media,separator,undo,redo,separator,cleanup,code',
    'theme_advanced_buttons2': '',
    'theme_advanced_buttons3': '',
    'theme_advanced_statusbar_location': 'bottom',
    'theme_advanced_toolbar_location': 'top',
    'theme_advanced_toolbar_align': 'center',
    'theme_advanced_resizing': True,
    'theme_advanced_resize_horizontal': False,
    'plugins': 'media',
    'width': '95%',
    'resize': "both",
    'valid_elements': ('@[id|class|style|title|dir<ltr?rtl|lang|xml::lang],'
                       'a[rel|rev|charset|hreflang|tabindex|accesskey|type|name|href|target|title|class],'
                       'img[longdesc|usemap|src|border|alt=|title|hspace|vspace|width|height|align],'
                       'p,em/i,strong/b,div[align],br,ul,li,ol,'
                       'iframe[src|frameborder=0|alt|title|width|height|align|name]'),
}
TINYMCE_DEFAULT_CONFIG.update(getattr(settings, 'TINYMCE_DEFAULT_CONFIG', {}))
setattr(settings, 'TINYMCE_DEFAULT_CONFIG', TINYMCE_DEFAULT_CONFIG)


_MAP_STYLES = {
    'detail': {'weight': 5, 'opacity': 1, 'color': 'yellow', 'arrowColor': '#FF5E00', 'arrowSize': 8},
    'others': {'opacity': 0.9, 'fillOpacity': 0.7, 'color': 'yellow'},
    'filelayer': {'color': 'red', 'opacity': 1.0, 'fillOpacity': 0.9, 'weight': 2, 'radius': 5},
    'draw': {'color': '#35FF00', 'opacity': 0.8, 'weight': 3},
}


_LEAFLET_PLUGINS = OrderedDict([
    ('leaflet.overintent', {
        'js': 'mapentity/Leaflet.OverIntent/leaflet.overintent.js',
    }),
    ('leaflet.label', {
        'css': 'mapentity/Leaflet.label/dist/leaflet.label.css',
        'js': 'mapentity/Leaflet.label/dist/leaflet.label.js'
    }),
    ('leaflet.spin', {
        'js': ['mapentity/spin.js/dist/spin.js',
               'mapentity/Leaflet.Spin/leaflet.spin.js']
    }),
    ('leaflet.layerindex', {
        'js': ['mapentity/RTree/src/rtree.js',
               'mapentity/Leaflet.LayerIndex/leaflet.layerindex.js']
    }),
    ('leaflet.filelayer', {
        'js': ['mapentity/togeojson/togeojson.js',
               'mapentity/Leaflet.FileLayer/leaflet.filelayer.js']
    }),
    ('leaflet.textpath', {
        'js': 'mapentity/Leaflet.TextPath/leaflet.textpath.js'
    }),
    ('leaflet.geometryutil', {
        'js': 'mapentity/Leaflet.GeometryUtil/dist/leaflet.geometryutil.js'
    }),
    ('forms', {}),
    ('leaflet.snap', {
        'js': 'mapentity/Leaflet.Snap/leaflet.snap.js'
    }),
    ('leaflet.measurecontrol', {
        'css': 'mapentity/Leaflet.MeasureControl/leaflet.measurecontrol.css',
        'js': 'mapentity/Leaflet.MeasureControl/leaflet.measurecontrol.js'
    }),
    ('mapentity', {
        'js': ['mapentity/mapentity.js',
               'mapentity/mapentity.forms.js'],
    })
])

_LEAFLET_CONFIG = getattr(settings, 'LEAFLET_CONFIG', {})
_LEAFLET_PLUGINS.update(_LEAFLET_CONFIG.get('PLUGINS', {}))  # mapentity plugins first
_LEAFLET_CONFIG['PLUGINS'] = _LEAFLET_PLUGINS
setattr(settings, 'LEAFLET_CONFIG', _LEAFLET_CONFIG)


MapEntity = namedtuple('MapEntity', ['menu', 'label', 'modelname', 'url_list',
                                     'icon', 'icon_small', 'icon_big'])


class Registry(object):
    def __init__(self):
        self.registry = OrderedDict()
        self.apps = {}
        self.content_type_ids = []

    def register(self, model, name='', menu=True):
        """ Register model and returns URL patterns
        """
        from .urlizor import view_classes_to_url
        from .signals import post_register

        # Ignore models from not installed apps
        if not model._meta.installed:
            return ()
        # Register once only
        if model in self.registry:
            return ()

        # Obtain app's views module from Model
        views_module_name = re.sub('models.*', 'views', model.__module__)
        views_module = import_module(views_module_name)
        # Filter to views inherited from MapEntity base views
        picked = []
        for name, view in inspect.getmembers(views_module):
            if inspect.isclass(view) and issubclass(view, View):
                if hasattr(view, 'get_entity_kind'):
                    try:
                        view_model = view.model or view.queryset.model
                    except AttributeError:
                        pass
                    else:
                        if view_model is model:
                            picked.append(view)

        module_name = model._meta.module_name
        app_label = model._meta.app_label

        mapentity = MapEntity(label=model._meta.verbose_name_plural,
                              modelname=module_name,
                              icon='images/%s.png' % module_name,
                              icon_small='images/%s-16.png' % module_name,
                              icon_big='images/%s-96.png' % module_name,
                              menu=menu,
                              url_list='%s:%s_%s' % (app_label, module_name, 'list'))

        self.registry[model] = mapentity
        post_register.send(sender=self, app_label=app_label, model=model)

        self.content_type_ids.append(model.get_content_type_id())
        # Returns Django URL patterns
        return patterns(name, *view_classes_to_url(*picked))

    @property
    def entities(self):
        return self.registry.values()


registry = Registry()
