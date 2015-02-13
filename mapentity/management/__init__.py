import logging

from django.db.models import get_models
from django.db.models.signals import post_syncdb
from django.contrib.contenttypes.models import ContentType

from mapentity.middleware import clear_internal_user_cache
from mapentity.registry import create_mapentity_model_permissions


logger = logging.getLogger(__name__)


def create_mapentity_models_permissions(app, **kwargs):
    """ Create `Permission` objects for each model registered
    in MapEntity.
    """

    logger.info("Synchronize permissions of MapEntity models")

    # During tests, the database is flushed so we need to flush caches in order
    # to correctly recreate all permissions
    clear_internal_user_cache()
    ContentType.objects.clear_cache()

    for model in get_models(app):
        create_mapentity_model_permissions(model)


post_syncdb.connect(create_mapentity_models_permissions,
                    dispatch_uid="create_mapentity_models_permissions")
