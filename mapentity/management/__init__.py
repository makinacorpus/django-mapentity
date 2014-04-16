from django.db.models.signals import post_syncdb
from django.db import DEFAULT_DB_ALIAS
from django.contrib.contenttypes.models import ContentType
from django.contrib import auth
from django.contrib.auth.models import Permission
from django.utils.translation import ugettext as _

from mapentity import models as mapentity_models
from mapentity import logger, registry


def create_mapentity_models_permissions(sender, **kwargs):
    """ Create `Permission` objects for each model registered
    in MapEntity.

    Could have been implemented a metaclass on `MapEntityMixin`. We chose
    this approach to avoid problems with inheritance of permissions on
    abstract models.

    See:
        * https://code.djangoproject.com/ticket/10686
        * http://stackoverflow.com/a/727956/141895
    """
    db = DEFAULT_DB_ALIAS
    app_models = kwargs.get('app')

    if app_models == mapentity_models:

        logger.info("Synchronize migrations of MapEntity models")

        for model in registry.registry.keys():

            permissions = set()
            for view_kind in mapentity_models.ENTITY_KINDS:
                perm = model.get_entity_kind_permission(view_kind)
                codename = auth.get_permission_codename(perm, model._meta)
                name = "Can %s %s" % (perm, model._meta.verbose_name_raw)
                permissions.add((codename, _(name)))

            perms_manager = Permission.objects.using(db)
            ctype = ContentType.objects.db_manager(db).get_for_model(model)
            for (codename, name) in permissions:
                p, created = perms_manager.get_or_create(codename=codename,
                                                         name=name[:50],
                                                         content_type=ctype)
                if created:
                    logger.info("Permission '%s' created." % codename)


post_syncdb.connect(create_mapentity_models_permissions,
                    dispatch_uid="create_mapentity_models_permissions")
