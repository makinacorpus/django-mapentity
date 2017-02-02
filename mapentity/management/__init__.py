import logging

from django.db.models.signals import post_migrate
from django.contrib.contenttypes.models import ContentType

from mapentity.middleware import clear_internal_user_cache
from mapentity.registry import create_mapentity_model_permissions


logger = logging.getLogger(__name__)


def create_mapentity_models_permissions(app_config, **kwargs):
    """ Create `Permission` objects for each model registered
    in MapEntity.
    """

    logger.info("Synchronize permissions of MapEntity models")

    # During tests, the database is flushed so we need to flush caches in order
    # to correctly recreate all permissions
    clear_internal_user_cache()
    ContentType.objects.clear_cache()

    for model in app_config.get_models():
        create_mapentity_model_permissions(model)


post_migrate.connect(create_mapentity_models_permissions,
                     dispatch_uid="create_mapentity_models_permissions")
