from collections import OrderedDict
from copy import deepcopy

from django.conf import settings
from django.contrib.messages import constants as messages

API_SRID = 4326

_DEFAULT_MAP_STYLES = {
    'detail': {'weight': 5, 'opacity': 1, 'color': 'yellow', 'arrowColor': '#FF5E00', 'arrowSize': 8},
    'others': {'opacity': 0.9, 'fillOpacity': 0.7, 'color': 'yellow'},
    'filelayer': {'color': 'red', 'opacity': 1.0, 'fillOpacity': 0.9, 'weight': 2, 'radius': 5},
    'draw': {'color': '#35FF00', 'opacity': 0.8, 'weight': 3},
    'print': {},
}

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
    'GPX_FIELD_NAME': 'geom',
    'DATE_UPDATE_FIELD_NAME': 'date_update',
    'MAP_BACKGROUND_FOGGED': False,
    'MAP_FIT_MAX_ZOOM': 18,
    'ACTION_HISTORY_ENABLED': True,
    'ACTION_HISTORY_LENGTH': 20,
    'ANONYMOUS_VIEWS_PERMS': tuple(),
    'GEOJSON_LAYERS_CACHE_BACKEND': 'default',
    'GEOJSON_PRECISION': None,
    'SERVE_MEDIA_AS_ATTACHMENT': True,
    'SENDFILE_HTTP_HEADER': None,
    'DRF_API_URL_PREFIX': r'^api/',
    'MAPENTITY_WEASYPRINT': False,
    'MAP_STYLES': _DEFAULT_MAP_STYLES,
    'REGEX_PATH_ATTACHMENTS': r'\.\d+x\d+_q\d+(_crop)?\.(jpg|png|jpeg)$',
}, **getattr(settings, 'MAPENTITY_CONFIG', {}))

# default MAP_STYLES should not be replaced but updated by MAPENTITY_CONFIG
_MAP_STYLES = deepcopy(_DEFAULT_MAP_STYLES)
_MAP_STYLES.update(app_settings['MAP_STYLES'])
app_settings['MAP_STYLES'] = _MAP_STYLES

CRISPY_TEMPLATE_PACK = 'bootstrap4'

TINYMCE_DEFAULT_CONFIG = {
    "theme": "silver",
    "height": 500,
    "menubar": False,
    "plugins": "advlist,autolink,lists,link,image,charmap,print,preview,anchor,"
               "searchreplace,visualblocks,code,fullscreen,insertdatetime,media,table,paste,"
               "code,help,wordcount,textcolor",
    "toolbar": "undo redo | formatselect | "
               "bold italic forecolor backcolor | link image media | alignleft aligncenter "
               "alignright alignjustify | bullist numlist outdent indent | "
               "removeformat | code | help",
    'paste_auto_cleanup_on_paste': True,
    'forced_root_block': False,
    'width': '95%',
    'resize': "both",
    'valid_elements': ('@[id|class|style|title|dir<ltr?rtl|lang|xml::lang],'
                       'a[rel|rev|charset|hreflang|tabindex|accesskey|type|name|href|target|title|class],'
                       'img[longdesc|usemap|src|border|alt=|title|hspace|vspace|width|height|align],'
                       'p,em/i,strong/b,div[align],br,ul,li,ol,span[style],'
                       'iframe[src|frameborder=0|alt|title|width|height|align|name]'),
}
TINYMCE_DEFAULT_CONFIG.update(getattr(settings, 'TINYMCE_DEFAULT_CONFIG', {}))
setattr(settings, 'TINYMCE_DEFAULT_CONFIG', TINYMCE_DEFAULT_CONFIG)


REST_FRAMEWORK_DEFAULT_CONFIG = {
    # Use Django's standard `django.contrib.auth` permissions,
    # or allow read-only access for unauthenticated users.
    'DEFAULT_PERMISSION_CLASSES': [
        'mapentity.models.MapEntityRestPermissions'
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
        'mapentity.renderers.GeoJSONRenderer',
    ],
}
REST_FRAMEWORK_DEFAULT_CONFIG.update(getattr(settings, 'REST_FRAMEWORK', {}))
setattr(settings, 'REST_FRAMEWORK', REST_FRAMEWORK_DEFAULT_CONFIG)

for name, override in getattr(settings, 'MAP_STYLES', {}).items():
    # fallback old settings MAP_STYLES
    merged = app_settings['MAP_STYLES'].get(name, {})
    merged.update(override)
    app_settings['MAP_STYLES'][name] = merged

_LEAFLET_PLUGINS = OrderedDict([
    ('leaflet.overintent', {
        'js': 'mapentity/Leaflet.OverIntent/leaflet.overintent.js',
    }),
    ('leaflet.label', {
        'css': 'mapentity/Leaflet.label/dist/leaflet.label.css',
        'js': 'mapentity/Leaflet.label/dist/leaflet.label.js'
    }),
    ('leaflet.spin', {
        'js': ['paperclip/spin.min.js',
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
    ('leaflet.fullscreen', {
        'css': 'mapentity/leaflet.fullscreen/Control.FullScreen.css',
        'js': 'mapentity/leaflet.fullscreen/Control.FullScreen.js'
    }),
    ('leaflet.groupedlayercontrol', {
        'css': 'mapentity/Leaflet.groupedlayercontrol/src/leaflet.groupedlayercontrol.css',
        'js': 'mapentity/Leaflet.groupedlayercontrol/src/leaflet.groupedlayercontrol.js'
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

# MODELTRANSLATION config
_MODELTRANSLATION_LANGUAGES = getattr(settings, 'MODELTRANSLATION_LANGUAGES', tuple(x[0] for x in settings.LANGUAGES))
_MODELTRANSLATION_DEFAULT_LANGUAGE = getattr(settings, 'MODELTRANSLATION_DEFAULT_LANGUAGE',
                                             _MODELTRANSLATION_LANGUAGES[0])
setattr(settings, 'MODELTRANSLATION_LANGUAGES', _MODELTRANSLATION_LANGUAGES)
setattr(settings, 'MODELTRANSLATION_DEFAULT_LANGUAGE', _MODELTRANSLATION_DEFAULT_LANGUAGE)

# default django message tags matching bootstrap4
_MESSAGE_TAGS = getattr(settings, 'MESSAGE_TAGS', {
    messages.SUCCESS: 'alert-success',
    messages.INFO: 'alert-info',
    messages.DEBUG: 'alert-info',
    messages.WARNING: 'alert-warning',
    messages.ERROR: 'alert-danger',
})

setattr(settings, 'MESSAGE_TAGS', _MESSAGE_TAGS)

# crispy form default config with bootstrap4
_CRISPY_ALLOWED_TEMPLATE_PACKS = getattr(settings, 'CRISPY_ALLOWED_TEMPLATE_PACKS', ('bootstrap4', ))
setattr(settings, 'CRISPY_ALLOWED_TEMPLATE_PACKS', _CRISPY_ALLOWED_TEMPLATE_PACKS)

_CRISPY_TEMPLATE_PACK = getattr(settings, 'CRISPY_TEMPLATE_PACK', 'bootstrap4')
setattr(settings, 'CRISPY_TEMPLATE_PACK', _CRISPY_TEMPLATE_PACK)
