from django.conf import settings
from django.conf.urls import patterns, url

from .views import (map_screenshot, convert, history_delete,
                    serve_secure_media, JSSettings)


urlpatterns = patterns(
    '',
    url(r'^%s(?P<path>.*?)$' % settings.MEDIA_URL[1:], serve_secure_media),
    url(r'^map_screenshot/$', map_screenshot, name='map_screenshot'),
    url(r'^convert/$', convert, name='convert'),
    url(r'^history/delete/$', history_delete, name='history_delete'),
    # See default value in app_settings.JS_SETTINGS.
    # Will be overriden, most probably.
    url(r'^api/settings.json$', JSSettings.as_view(), name='js_settings'),
)
