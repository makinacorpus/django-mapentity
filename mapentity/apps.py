from django.apps import AppConfig
from django.db.models.signals import post_migrate

from mapentity.signals import migrate_tiles


class MapEntityConfig(AppConfig):
    name = "mapentity"
    verbose_name = "MapEntity"

    def ready(self):
        from . import checks  # noqa: F401

        post_migrate.connect(migrate_tiles, sender=self)
