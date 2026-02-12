from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class MapboxBaselayerConfig(AppConfig):
    default_auto_field = "django.db.models.AutoField"
    name = "mapbox_baselayer"
    verbose_name = _("MapBox Utils")
