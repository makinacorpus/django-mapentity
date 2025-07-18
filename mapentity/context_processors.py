from django.conf import settings as settings_  # import the settings file

from mapentity import __version__

from .registry import registry
from .settings import app_settings


def settings(request):
    allowed_entities = [
        entity
        for entity in registry.entities
        if request.user.has_perm(entity.model.get_permission_codename("list"))
    ]
    return dict(
        TITLE=app_settings["TITLE"],
        DEBUG=settings_.DEBUG,
        VERSION=getattr(settings_, "VERSION", __version__),
        JS_SETTINGS_VIEW=app_settings["JS_SETTINGS_VIEW"],
        TRANSLATED_LANGUAGES=app_settings["TRANSLATED_LANGUAGES"],
        MODELTRANSLATION_LANGUAGES=settings_.MODELTRANSLATION_LANGUAGES,
        MAP_BACKGROUND_FOGGED=app_settings["MAP_BACKGROUND_FOGGED"],
        MAP_FIT_MAX_ZOOM=app_settings["MAP_FIT_MAX_ZOOM"],
        ACTION_HISTORY_ENABLED=app_settings["ACTION_HISTORY_ENABLED"],
        MAX_CHARACTERS=app_settings["MAX_CHARACTERS"],
        allowed_entities=allowed_entities,
    )
