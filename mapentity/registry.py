import inspect
import logging
import re
from collections import OrderedDict
from importlib import import_module

from django.contrib import auth
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from django.db import DEFAULT_DB_ALIAS
from django.db.utils import ProgrammingError
from django.urls import re_path
from django.utils.translation import gettext as _
from django.views.generic.base import View
from paperclip.settings import get_attachment_model
from rest_framework import routers as rest_routers
from rest_framework.serializers import ModelSerializer

from mapentity import models as mapentity_models
from mapentity.serializers import MapentityGeojsonModelSerializer
from mapentity.settings import app_settings
from mapentity.utils import get_internal_user

logger = logging.getLogger(__name__)


class MapEntityOptions:
    menu = True
    label = ""
    modelname = ""
    url_list = ""
    url_add = ""
    icon = ""
    icon_small = ""
    icon_big = ""
    dynamic_views = None

    def __init__(self, model):
        self.model = model
        self.label = model._meta.verbose_name_plural
        self.app_label = model._meta.app_label
        self.modelname = model._meta.model_name
        self.icon = f"images/{self.modelname}.png"
        self.icon_small = f"images/{self.modelname}-16.png"
        self.icon_big = f"images/{self.modelname}-96.png"

        self.rest_router = rest_routers.DefaultRouter(trailing_slash=False)

        # Can't do reverse right now, URL not setup yet
        self.url_list = "{}:{}_{}".format(self.app_label, self.modelname, "list")
        self.url_add = "{}:{}_{}".format(self.app_label, self.modelname, "add")

    def scan_views(self):
        """
        Returns the list of URLs/views.
        """
        from . import views as mapentity_views

        # Obtain app's views module from Model
        views_module_name = re.sub("models.*", "views", self.model.__module__)
        views_module = import_module(views_module_name)
        # Filter to views inherited from MapEntity base views
        picked = []
        rest_viewset = None
        list_view = None

        for name, view in inspect.getmembers(views_module):
            if inspect.isclass(view) and issubclass(view, View):
                # Pick-up views
                if hasattr(view, "get_entity_kind") or issubclass(
                    view, mapentity_views.MapEntityViewSet
                ):
                    try:
                        view_model = view.model or view.queryset.model
                    except AttributeError:
                        pass
                    else:
                        if view_model is self.model:
                            if issubclass(view, mapentity_views.MapEntityViewSet):
                                rest_viewset = view
                            elif issubclass(view, mapentity_views.MapEntityList):
                                picked.append(view)
                                list_view = view
                            else:
                                picked.append(view)

        _model = self.model

        if self.dynamic_views is None:
            generic_views = mapentity_views.MAPENTITY_GENERIC_VIEWS
        else:
            generic_views = [
                getattr(mapentity_views, f"MapEntity{name}")
                for name in self.dynamic_views
            ]

        # Dynamically define missing views
        for generic_view in generic_views:
            already_defined = any([issubclass(view, generic_view) for view in picked])
            if not already_defined:
                list_dependencies = (mapentity_views.MapEntityFormat,)
                if list_view and generic_view in list_dependencies:
                    # List view depends on JsonList and Format view
                    class dynamic_view(generic_view, list_view):
                        pass
                else:
                    # General case
                    class dynamic_view(generic_view):
                        model = _model

                picked.append(dynamic_view)

        # Dynamically define REST missing viewset
        if rest_viewset is None:
            _queryset = self.get_queryset()
            _serializer = self.get_serializer()
            _geojson_serializer = self.get_geojson_serializer()

            class dynamic_viewset(mapentity_views.MapEntityViewSet):
                queryset = _queryset
                serializer_class = _serializer
                geojson_serializer_class = _geojson_serializer

            rest_viewset = dynamic_viewset
        self.rest_router.register(
            r"api/" + self.modelname + "/drf/" + self.modelname + "s",
            rest_viewset,
            basename=f"{self.modelname}-drf",
        )

        # Returns Django URL patterns
        return self.__view_classes_to_url(*picked)

    def get_serializer(self):
        _model = self.model

        class Serializer(ModelSerializer):
            class Meta:
                model = _model
                id_field = "id"
                exclude = []

        return Serializer

    def get_geojson_serializer(self):
        _model = self.model

        class Serializer(MapentityGeojsonModelSerializer):
            class Meta(MapentityGeojsonModelSerializer):
                model = _model

        return Serializer

    def get_queryset(self):
        return self.model.objects.all()

    def _url_path(self, view_kind):
        kind_to_urlpath = {
            mapentity_models.ENTITY_LIST: r"^{modelname}/list/$",
            mapentity_models.ENTITY_FILTER: r"^{modelname}/filter/$",
            mapentity_models.ENTITY_VIEWSET: r"^api/{modelname}/drf/{modelname}$",
            mapentity_models.ENTITY_FORMAT_LIST: r"^{modelname}/list/export/$",
            mapentity_models.ENTITY_DETAIL: r"^{modelname}/(?P<pk>\d+)/$",
            mapentity_models.ENTITY_MAPIMAGE: r"^image/{modelname}-(?P<pk>\d+).png$",
            mapentity_models.ENTITY_CREATE: r"^{modelname}/add/$",
            mapentity_models.ENTITY_UPDATE: r"^{modelname}/edit/(?P<pk>\d+)/$",
            mapentity_models.ENTITY_DELETE: r"^{modelname}/delete/(?P<pk>\d+)/$",
            mapentity_models.ENTITY_MARKUP: r"^{modelname}/markup/(?P<pk>\d+)/$",
        }
        if app_settings["MAPENTITY_WEASYPRINT"]:
            kind_to_urlpath[mapentity_models.ENTITY_DOCUMENT] = (
                r"^document/{modelname}-(?P<pk>\d+).pdf$"
            )
        else:
            kind_to_urlpath[mapentity_models.ENTITY_DOCUMENT] = (
                r"^document/{modelname}-(?P<pk>\d+).odt$"
            )
        kind_to_urlpath[mapentity_models.ENTITY_DUPLICATE] = (
            r"^{modelname}/duplicate/(?P<pk>\d+)/$"
        )
        url_path = kind_to_urlpath[view_kind]
        url_path = url_path.format(modelname=self.modelname)
        return url_path

    def url_for(self, view_class):
        view_kind = view_class.get_entity_kind()
        url_path = self._url_path(view_kind)
        url_name = self.url_shortname(view_kind)
        return re_path(url_path, view_class.as_view(), name=url_name)

    def __view_classes_to_url(self, *view_classes):
        return [
            self.url_for(view_class) for view_class in view_classes
        ] + self.rest_router.urls

    def url_shortname(self, kind):
        assert kind in mapentity_models.ENTITY_KINDS
        return f"{self.modelname}_{kind}"

    def url_name(self, kind):
        assert kind in mapentity_models.ENTITY_KINDS
        return f"{self.app_label}:{self.url_shortname(kind)}"


class Registry:
    def __init__(self):
        self.registry = OrderedDict()
        self.apps = {}
        self.content_type_ids = []

    def register(self, model, options=None, menu=None):
        """Register model and returns URL patterns"""
        # Ignore models from not installed apps
        if model._meta.app_config is None:
            return []
        # Register once only
        if model in self.registry:
            return []

        if options is None:
            options = MapEntityOptions(model)
        else:
            options = options(model)

        setattr(model, "_entity", options)

        # Smoother upgrade for Geotrek
        if menu is not None:
            # Deprecated :)
            options.menu = menu

        self.registry[model] = options

        try:
            self.content_type_ids.append(model.get_content_type_id())
        except (RuntimeError, ProgrammingError):
            pass  # Content types table is not yet synced

        return options.scan_views()

    @property
    def entities(self):
        return self.registry.values()


registry = Registry()


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
        name = f"Can {perm} {model._meta.verbose_name_raw}"
        permissions.add((codename, _(name)))

    ctype = ContentType.objects.db_manager(db).get_for_model(model)
    for codename, name in permissions:
        p, created = perms_manager.get_or_create(codename=codename, content_type=ctype)
        if created:
            p.name = name[:50]
            p.save()
            msg = f"Permission '{codename}' created."
            logger.info(msg)

    for view_kind in (mapentity_models.ENTITY_LIST, mapentity_models.ENTITY_DOCUMENT):
        perm = model.get_entity_kind_permission(view_kind)
        codename = auth.get_permission_codename(perm, model._meta)

        internal_user_permission = internal_user.user_permissions.filter(
            codename=codename, content_type=ctype
        )

        if not internal_user_permission.exists():
            try:
                permission = perms_manager.get(codename=codename, content_type=ctype)
                internal_user.user_permissions.add(permission)
                msg = f"Added permission {codename} to internal user {internal_user}"
                logger.info(msg)
            except Exception:
                pass

    attachmenttype = ContentType.objects.db_manager(db).get_for_model(
        get_attachment_model()
    )
    read_perm = dict(codename="read_attachment", content_type=attachmenttype)
    if not internal_user.user_permissions.filter(**read_perm).exists():
        permission = perms_manager.get(**read_perm)
        try:
            internal_user.user_permissions.add(permission)
            msg = f"Added permission {permission.codename} to internal user {internal_user}"
            logger.info(msg)

        except Exception:
            pass
