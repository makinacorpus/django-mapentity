from django.conf import settings
from django.utils.importlib import import_module
from django.core.management.base import BaseCommand

from mapentity import registry, logger
from mapentity.registry import create_mapentity_model_permissions


class Command(BaseCommand):
    help = "Create MapEntity models permissions"

    def execute(self, *args, **options):
        logger.info("Synchronize permissions of MapEntity models")

        # Make sure apps are registered at this point
        import_module(settings.ROOT_URLCONF)

        # For all models registered, add missing bits
        for model in registry.registry.keys():
            create_mapentity_model_permissions(model)

        logger.info("Done.")
