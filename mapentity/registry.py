import re
import inspect
from collections import OrderedDict

from django.db.utils import ProgrammingError
from django.db import DEFAULT_DB_ALIAS
from django.utils.importlib import import_module
from django.utils.translation import ugettext as _
from django.views.generic.base import View
from django.conf.urls import patterns
from django.contrib.contenttypes.models import ContentType
from django.contrib import auth
from django.contrib.auth.models import Permission

from mapentity import models as mapentity_models
from mapentity.middleware import get_internal_user
from mapentity import logger

from paperclip import models as paperclip_models


class MapEntityOptions(object):
    menu = True
    label = ''
    modelname = ''
    url_list = ''
    url_add = ''
    icon = ''
    icon_small = ''
    icon_big = ''
    dynamic_views = None

    def __init__(self, model):
        self.model = model
        self.label = model._meta.verbose_name_plural
        self.app_label = model._meta.app_label
        self.module_name = model._meta.module_name
        self.modelname = self.module_name
        self.icon = 'images/%s.png' % self.module_name
        self.icon_small = 'images/%s-16.png' % self.module_name
        self.icon_big = 'images/%s-96.png' % self.module_name
        # Can't do reverse right now, URL not setup yet
        self.url_list = '%s:%s_%s' % (self.app_label, self.module_name, 'list')
        self.url_add = '%s:%s_%s' % (self.app_label, self.module_name, 'add')

    def scan_views(self):
        """
        Returns the list of URLs/views.
        """
        from .views import generic as mapentity_views
        from .views.generic import (
            MAPENTITY_GENERIC_VIEWS,
            MapEntityList,
            MapEntityJsonList,
            MapEntityFormat
        )
        from .urlizor import view_classes_to_url

        # Obtain app's views module from Model
        views_module_name = re.sub('models.*', 'views', self.model.__module__)
        views_module = import_module(views_module_name)
        # Filter to views inherited from MapEntity base views
        picked = []
        list_view = None
        for name, view in inspect.getmembers(views_module):
            if inspect.isclass(view) and issubclass(view, View):
                if hasattr(view, 'get_entity_kind'):
                    try:
                        view_model = view.model or view.queryset.model
                    except AttributeError:
                        pass
                    else:
                        if view_model is self.model:
                            picked.append(view)
                            if issubclass(view, MapEntityList):
                                list_view = view

        _model = self.model

        if self.dynamic_views is None:
            generic_views = MAPENTITY_GENERIC_VIEWS
        else:
            generic_views = [getattr(mapentity_views, 'MapEntity%s' % name)
                             for name in self.dynamic_views]

        # Dynamically define missing views
        for generic_view in generic_views:
            already_defined = any([issubclass(view, generic_view) for view in picked])
            if not already_defined:
                if list_view and generic_view in (MapEntityJsonList, MapEntityFormat):
                    # List view depends on JsonList and Format view
                    class dynamic_view(generic_view, list_view):
                        pass
                else:
                    # General case
                    class dynamic_view(generic_view):
                        model = _model
                picked.append(dynamic_view)

        # Returns Django URL patterns
        return patterns('', *view_classes_to_url(*picked))


class Registry(object):
    def __init__(self):
        self.registry = OrderedDict()
        self.apps = {}
        self.content_type_ids = []

    def register(self, model, options=None, menu=None):
        """ Register model and returns URL patterns
        """
        from .signals import post_register

        # Ignore models from not installed apps
        if not model._meta.installed:
            return ()
        # Register once only
        if model in self.registry:
            return ()

        if options is None:
            options = MapEntityOptions(model)
        else:
            options = options(model)

        # Smoother upgrade for Geotrek
        if menu is not None:
            # Deprecated :)
            options.menu = menu

        self.registry[model] = options
        post_register.send(sender=self, app_label=options.app_label, model=model)

        try:
            self.content_type_ids.append(model.get_content_type_id())
        except ProgrammingError:
            pass  # Content types table is not yet synced

        return options.scan_views()

    @property
    def entities(self):
        return self.registry.values()


def create_mapentity_model_permissions(model):
    """
    Create all the necessary permissions for the specified model.

    And give all the required permission to the ``internal_user``, used
    for screenshotting and document conversion.

    :notes:

        Could have been implemented a metaclass on `MapEntityMixin`. We chose
        this approach to avoid problems with inheritance of permissions on
        abstract models.

        See:
            * https://code.djangoproject.com/ticket/10686
            * http://stackoverflow.com/a/727956/141895
    """
    if not issubclass(model, mapentity_models.MapEntityMixin):
        return

    db = DEFAULT_DB_ALIAS

    internal_user = get_internal_user()
    perms_manager = Permission.objects.using(db)

    permissions = set()
    for view_kind in mapentity_models.ENTITY_KINDS:
        perm = model.get_entity_kind_permission(view_kind)
        codename = auth.get_permission_codename(perm, model._meta)
        name = "Can %s %s" % (perm, model._meta.verbose_name_raw)
        permissions.add((codename, _(name)))

    ctype = ContentType.objects.db_manager(db).get_for_model(model)
    for (codename, name) in permissions:
        p, created = perms_manager.get_or_create(codename=codename,
                                                 content_type=ctype)
        if created:
            p.name = name[:50]
            p.save()
            logger.info("Permission '%s' created." % codename)

    for view_kind in (mapentity_models.ENTITY_LIST,
                      mapentity_models.ENTITY_DOCUMENT):
        perm = model.get_entity_kind_permission(view_kind)
        codename = auth.get_permission_codename(perm, model._meta)

        internal_user_permission = internal_user.user_permissions.filter(codename=codename,
                                                                         content_type=ctype)

        if not internal_user_permission.exists():
            permission = perms_manager.get(codename=codename, content_type=ctype)
            internal_user.user_permissions.add(permission)
            logger.info("Added permission %s to internal user %s" % (codename,
                                                                     internal_user))

    attachmenttype = ContentType.objects.db_manager(db).get_for_model(paperclip_models.Attachment)
    read_perm = dict(codename='read_attachment', content_type=attachmenttype)
    if not internal_user.user_permissions.filter(**read_perm).exists():
        permission = perms_manager.get(**read_perm)
        internal_user.user_permissions.add(permission)
        logger.info("Added permission %s to internal user %s" % (permission.codename,
                                                                 internal_user))
