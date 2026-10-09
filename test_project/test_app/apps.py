from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class TestAppConfig(AppConfig):
    name = "test_project.test_app"
    verbose_name = _("Test App")
