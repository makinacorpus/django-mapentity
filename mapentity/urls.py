from django.conf import settings
from django.urls import include, path, re_path
from django.views.i18n import JavaScriptCatalog

from .registry import registry
from .settings import app_settings
from .views import Convert, JSSettings, ServeAttachment, history_delete, map_screenshot

if app_settings["ACTION_HISTORY_ENABLED"]:
    from .models import LogEntry


_MEDIA_URL = settings.MEDIA_URL.replace(app_settings["ROOT_URL"], "")
if _MEDIA_URL.startswith("/"):
    _MEDIA_URL = _MEDIA_URL[1:]
if _MEDIA_URL.endswith("/"):
    _MEDIA_URL = _MEDIA_URL[:-1]


app_name = "mapentity"
urlpatterns = [
    path("jsi18n/", JavaScriptCatalog.as_view(), name="javascript-catalog"),
    path("map_screenshot/", map_screenshot, name="map_screenshot"),
    path("convert/", Convert.as_view(), name="convert"),
    path("history/delete/", history_delete, name="history_delete"),
    path("api/auth/", include("rest_framework.urls")),
    # See default value in app_settings.JS_SETTINGS.
    # Will be overriden, most probably.
    path("api/settings.json", JSSettings.as_view(), name="js_settings"),
]


if settings.DEBUG or app_settings["SENDFILE_HTTP_HEADER"]:
    urlpatterns += [
        re_path(rf"^{_MEDIA_URL}/(?P<path>paperclip/.*)$", ServeAttachment.as_view()),
    ]


if app_settings["ACTION_HISTORY_ENABLED"]:
    urlpatterns += registry.register(LogEntry, menu=False)
