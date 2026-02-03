from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class TestShapesConfig(AppConfig):
    name = "test_project.test_shapes"
    verbose_name = _("Test Shapes")
