from . import *  # NOQA
import os

INTERNAL_IPS = []  # disable django-debug-toolbar
DATABASES = {
    "default": {
        "ENGINE": "django.contrib.gis.db.backends.spatialite",
        "NAME": os.path.join(BASE_DIR, "database_e2e.db"),
    }
}
VECTOR_TILES_BACKEND = "vectortiles.backends.python"