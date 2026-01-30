from . import *  # NOQA
import os

INTERNAL_IPS = []  # disable django-debug-toolbar
DATABASES["default"]["NAME"] = os.path.join(BASE_DIR, "database_e2e.db")
