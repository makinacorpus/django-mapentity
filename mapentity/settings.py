from collections import OrderedDict
from copy import deepcopy
from django.conf import settings
from django.contrib.messages import constants as messages
from django.core.exceptions import ImproperlyConfigured
from django.utils.translation import gettext_lazy as _

API_SRID = 4326

# Styles par défaut
_DEFAULT_MAP_STYLES = {
    'detail': {'weight': 5, 'opacity': 1, 'color': 'mediumpurple', 'arrowColor': '#FF5E00', 'arrowSize': 8},
    'others': {'opacity': 0.9, 'fillOpacity': 0.5, 'color': 'yellow'},
    'filelayer': {'color': 'red', 'opacity': 1.0, 'fillOpacity': 0.9, 'weight': 2, 'radius': 5},
    'draw': {'color': '#35FF00', 'opacity': 0.8, 'weight': 3},
    'print': {},
}

# Tuiles par défaut
_DEFAULT_TILES = {
    'OSM': {
        'name': 'OSM',
        'url': '//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'attribution': '© <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    },
}

# Config MapLibre par défaut
_DEFAULT_MAPLIBRE_CONFIG = {
    'BOUNDS': [[-3.630430, 40.120372], [3.208008, 45.061882]],
    'DEFAULT_CENTER': [1.3952, 43.5963],
    'DEFAULT_ZOOM': 5,
    'SCALE': 'metric',
    'TILES': _DEFAULT_TILES,
}

# Merge sécurisé : MAPLIBRE_CONFIG_OVERRIDES
MAPLIBRE_CONFIG = deepcopy(_DEFAULT_MAPLIBRE_CONFIG)

user_config = getattr(settings, 'MAPLIBRE_CONFIG_OVERRIDES', {})

for key in user_config:
    if key in MAPLIBRE_CONFIG:
        MAPLIBRE_CONFIG[key] = user_config[key]
    else:
        raise ImproperlyConfigured(f"MAPLIBRE_CONFIG_OVERRIDES contains an unknown key: {key}")

# Validation des champs
BOUNDS = MAPLIBRE_CONFIG.get("BOUNDS")
if BOUNDS is not None:
    if not isinstance(BOUNDS, (list, tuple)) or len(BOUNDS) != 2:
        raise ImproperlyConfigured(_("BOUNDS must be a list or tuple of two [lon, lat] coordinate pairs."))
    for point in BOUNDS:
        if not isinstance(point, (list, tuple)) or len(point) != 2:
            raise ImproperlyConfigured(_("Each point in BOUNDS must be a list or tuple with two floats (lon, lat)."))

DEFAULT_CENTER = MAPLIBRE_CONFIG.get("DEFAULT_CENTER")
if not (isinstance(DEFAULT_CENTER, (list, tuple)) and len(DEFAULT_CENTER) == 2):
    raise ImproperlyConfigured("MAPLIBRE_CONFIG['DEFAULT_CENTER'] must be a list/tuple with two elements - (lon, lat)")

DEFAULT_ZOOM = MAPLIBRE_CONFIG.get("DEFAULT_ZOOM")
if not (isinstance(DEFAULT_ZOOM, int) and (1 <= DEFAULT_ZOOM <= 24)):
    raise ImproperlyConfigured("MAPLIBRE_CONFIG['DEFAULT_ZOOM'] must be an int between 1 and 24.")

SCALE = MAPLIBRE_CONFIG.get("SCALE")
if SCALE is True:
    MAPLIBRE_CONFIG["SCALE"] = 'metric'
elif SCALE not in ('metric', 'imperial', None, False):
    raise ImproperlyConfigured("MAPLIBRE_CONFIG['SCALE'] must be True, False, None, 'metric', or  'imperial'")

if isinstance(MAPLIBRE_CONFIG.get('TILES'), str):
    MAPLIBRE_CONFIG['TILES'] = [(_('Background'), MAPLIBRE_CONFIG.get('TILES'), '')]

# App settings généraux
app_settings = dict({
    'TITLE': "Mapentity",
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
    'GEOM_FIELD_NAME': 'geom', # Nom du champ géométrique - utilisé pour début du nom de l'id de la carte qui vaut "geom-map
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
    'REGEX_PATH_ATTACHMENTS': r'\.\d+x\d+_q\d+(_crop)?\.(jpg|png|jpeg|bmp|webp)$',
    'MAX_CHARACTERS': None,
    'MAX_CHARACTERS_BY_FIELD': {},
    'MAPLIBRE_CONFIG': MAPLIBRE_CONFIG,
}, **getattr(settings, 'MAPENTITY_CONFIG', {}))

# Merge sécurisé MAP_STYLES
_MAP_STYLES = deepcopy(_DEFAULT_MAP_STYLES)
_MAP_STYLES.update(app_settings['MAP_STYLES'])
app_settings['MAP_STYLES'] = _MAP_STYLES

for name, override in getattr(settings, 'MAP_STYLES', {}).items():
    merged = app_settings['MAP_STYLES'].get(name, {})
    merged.update(override)
    app_settings['MAP_STYLES'][name] = merged


## config Tinymce
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
               "removeformat | code | wordcount | help",
    'paste_auto_cleanup_on_paste': True,
    'forced_root_block': False,
    'width': '95%',
    'resize': "both",
    'browser_spellcheck': True,
    'contextmenu': False,
    'valid_elements': ('@[id|class|style|title|dir<ltr?rtl|lang|xml::lang],'
                       'a[rel|rev|charset|hreflang|tabindex|accesskey|type|name|href|target|title|class],'
                       'img[longdesc|usemap|src|border|alt=|title|hspace|vspace|width|height|align],'
                       'p,em/i,strong/b,div[align],br,ul,li,ol,span[style],'
                       'iframe[src|frameborder=0|alt|title|width|height|align|name]'),
    'setup': 'tinyMceInit'
}
TINYMCE_DEFAULT_CONFIG.update(getattr(settings, 'TINYMCE_DEFAULT_CONFIG', {}))
setattr(settings, 'TINYMCE_DEFAULT_CONFIG', TINYMCE_DEFAULT_CONFIG)

# config Rest_Framework
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
CRISPY_TEMPLATE_PACK = 'bootstrap4'

_CRISPY_ALLOWED_TEMPLATE_PACKS = getattr(settings, 'CRISPY_ALLOWED_TEMPLATE_PACKS', ('bootstrap4', ))
setattr(settings, 'CRISPY_ALLOWED_TEMPLATE_PACKS', _CRISPY_ALLOWED_TEMPLATE_PACKS)

_CRISPY_TEMPLATE_PACK = getattr(settings, 'CRISPY_TEMPLATE_PACK', 'bootstrap4')
setattr(settings, 'CRISPY_TEMPLATE_PACK', _CRISPY_TEMPLATE_PACK)
