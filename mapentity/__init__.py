# Make sure mapentity settings are loaded before leaflet ones
import os
from . import settings  # noqa

here = os.path.abspath(os.path.dirname(__file__))

with open(os.path.join(here, 'VERSION')) as version_file:
    VERSION = version_file.read().strip()

default_app_config = 'mapentity.apps.MapEntityConfig'
__version__ = VERSION
