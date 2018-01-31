import os
import math

from django.contrib.contenttypes.fields import GenericRelation
from django.db import models
from django.db.utils import OperationalError
from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import FieldError, ObjectDoesNotExist
from django.core.urlresolvers import NoReverseMatch
from django.contrib import auth
from django.contrib.admin.models import LogEntry as BaseLogEntry
from django.contrib.admin.models import ADDITION, CHANGE, DELETION
from django.utils.formats import localize
from django.utils.timezone import utc
from django.utils.translation import ugettext_lazy as _
from rest_framework import permissions as rest_permissions

from mapentity.templatetags.mapentity_tags import humanize_timesince
from .settings import app_settings, API_SRID
from .helpers import smart_urljoin, is_file_newer, capture_map_image, extract_attributes_html


# Used to create the matching url name
ENTITY_LAYER = "layer"
ENTITY_LIST = "list"
ENTITY_JSON_LIST = "json_list"
ENTITY_FORMAT_LIST = "format_list"
ENTITY_DETAIL = "detail"
ENTITY_MAPIMAGE = "mapimage"
ENTITY_DOCUMENT = "document"
ENTITY_CREATE = "add"
ENTITY_UPDATE = "update"
ENTITY_DELETE = "delete"

ENTITY_KINDS = (
    ENTITY_LAYER, ENTITY_LIST, ENTITY_JSON_LIST,
    ENTITY_FORMAT_LIST, ENTITY_DETAIL, ENTITY_MAPIMAGE, ENTITY_DOCUMENT, ENTITY_CREATE,
    ENTITY_UPDATE, ENTITY_DELETE
)

ENTITY_PERMISSION_CREATE = 'add'
ENTITY_PERMISSION_READ = 'read'
ENTITY_PERMISSION_UPDATE = 'change'
ENTITY_PERMISSION_DELETE = 'delete'
ENTITY_PERMISSION_EXPORT = 'export'

ENTITY_PERMISSIONS = (
    ENTITY_PERMISSION_CREATE,
    ENTITY_PERMISSION_READ,
    ENTITY_PERMISSION_UPDATE,
    ENTITY_PERMISSION_DELETE,
    ENTITY_PERMISSION_EXPORT
)


class MapEntityRestPermissions(rest_permissions.DjangoModelPermissions):
    perms_map = {
        'GET': ['%(app_label)s.read_%(model_name)s'],
        'OPTIONS': ['%(app_label)s.read_%(model_name)s'],
        'HEAD': ['%(app_label)s.read_%(model_name)s'],
        'POST': ['%(app_label)s.add_%(model_name)s'],
        'PUT': ['%(app_label)s.change_%(model_name)s'],
        'PATCH': ['%(app_label)s.change_%(model_name)s'],
        'DELETE': ['%(app_label)s.delete_%(model_name)s'],
    }


class MapEntityMixin(models.Model):
    attachments = GenericRelation(settings.PAPERCLIP_ATTACHMENT_MODEL)

    _entity = None
    capture_map_image_waitfor = '.leaflet-tile-loaded'

    class Meta:
        abstract = True

    @classmethod
    def get_create_label(cls):
        name = cls._meta.verbose_name
        if hasattr(name, '_proxy____args'):
            name = name._proxy____args[0]  # untranslated
        # Whole "add" phrase translatable, but not catched  by makemessages
        return _(u"Add a new %s" % name.lower())

    @classmethod
    def get_entity_kind_permission(cls, entity_kind):
        operations = {
            ENTITY_CREATE: ENTITY_PERMISSION_CREATE,
            ENTITY_UPDATE: ENTITY_PERMISSION_UPDATE,
            ENTITY_DELETE: ENTITY_PERMISSION_DELETE,

            ENTITY_DETAIL: ENTITY_PERMISSION_READ,
            ENTITY_LAYER: ENTITY_PERMISSION_READ,
            ENTITY_LIST: ENTITY_PERMISSION_READ,
            ENTITY_JSON_LIST: ENTITY_PERMISSION_READ,

            ENTITY_FORMAT_LIST: ENTITY_PERMISSION_EXPORT,
            ENTITY_MAPIMAGE: ENTITY_PERMISSION_EXPORT,
            ENTITY_DOCUMENT: ENTITY_PERMISSION_EXPORT,
        }
        perm = operations.get(entity_kind, entity_kind)
        assert perm in ENTITY_PERMISSIONS
        return perm

    @classmethod
    def get_permission_codename(cls, entity_kind):
        perm = cls.get_entity_kind_permission(entity_kind)
        opts = cls._meta
        appname = opts.app_label.lower()
        if opts.proxy:
            proxied = opts.proxy_for_model._meta
            appname = proxied.app_label.lower()
        return '%s.%s' % (appname, auth.get_permission_codename(perm, opts))

    @classmethod
    def latest_updated(cls):
        try:
            fname = app_settings['DATE_UPDATE_FIELD_NAME']
            return cls.objects.latest(fname).get_date_update()
        except (cls.DoesNotExist, FieldError):
            return None

    def get_date_update(self):
        try:
            fname = app_settings['DATE_UPDATE_FIELD_NAME']
            return getattr(self, fname).replace(tzinfo=utc)
        except AttributeError:
            return None

    def get_geom(self):
        """ Get main geometry field.
        """
        return getattr(self, app_settings['GEOM_FIELD_NAME'], None)

    def delete(self, *args, **kwargs):
        # Delete map image capture when delete object
        image_path = self.get_map_image_path()
        if os.path.exists(image_path):
            os.unlink(image_path)
        super(MapEntityMixin, self).delete(*args, **kwargs)

    @classmethod
    @models.permalink
    def get_layer_url(cls):
        return (cls._entity.url_name(ENTITY_LAYER), )

    @classmethod
    @models.permalink
    def get_list_url(cls):
        return (cls._entity.url_name(ENTITY_LIST), )

    @classmethod
    @models.permalink
    def get_jsonlist_url(cls):
        return (cls._entity.url_name(ENTITY_JSON_LIST), )

    @classmethod
    @models.permalink
    def get_format_list_url(cls):
        return (cls._entity.url_name(ENTITY_FORMAT_LIST), )

    @classmethod
    @models.permalink
    def get_add_url(cls):
        return (cls._entity.url_name(ENTITY_CREATE), )

    def get_absolute_url(self):
        return self.get_detail_url()

    @classmethod
    @models.permalink
    def get_generic_detail_url(cls):
        return (cls._entity.url_name(ENTITY_DETAIL), [str(0)])

    @models.permalink
    def get_detail_url(self):
        return (self._entity.url_name(ENTITY_DETAIL), [str(self.pk)])

    @property
    def map_image_url(self):
        return self.get_map_image_url()

    @models.permalink
    def get_map_image_url(self):
        return (self._entity.url_name(ENTITY_MAPIMAGE), [str(self.pk)])

    @models.permalink
    def get_document_url(self):
        return (self._entity.url_name(ENTITY_DOCUMENT), [str(self.pk)])

    @models.permalink
    def get_update_url(self):
        return (self._entity.url_name(ENTITY_UPDATE), [str(self.pk)])

    @models.permalink
    def get_delete_url(self):
        return (self._entity.url_name(ENTITY_DELETE), [str(self.pk)])

    def get_map_image_extent(self, srid=API_SRID):
        fieldname = app_settings['GEOM_FIELD_NAME']
        obj = getattr(self, fieldname)
        obj.transform(srid)
        return obj.extent

    def prepare_map_image(self, rooturl):
        if self.get_geom() is None:
            return True
        path = self.get_map_image_path()
        # Do nothing if image is up-to-date
        if is_file_newer(path, self.get_date_update()):
            return False
        url = smart_urljoin(rooturl, self.get_detail_url())
        extent = self.get_map_image_extent(3857)
        length = max(extent[2] - extent[0], extent[3] - extent[1])
        if length:
            hint_size = app_settings['MAP_CAPTURE_SIZE']
            length_per_tile = 256 * length / hint_size
            RADIUS = 6378137
            CIRCUM = 2 * math.pi * RADIUS
            zoom = round(math.log(CIRCUM / length_per_tile, 2))
            size = math.ceil(length * 1.1 * 256 * 2 ** zoom / CIRCUM)
        else:
            size = app_settings['MAP_CAPTURE_SIZE']
        printcontext = self.get_printcontext() if hasattr(self, 'get_printcontext') else None
        capture_map_image(url, path, size=size, waitfor=self.capture_map_image_waitfor, printcontext=printcontext)
        return True

    def get_map_image_path(self):
        basefolder = os.path.join(settings.MEDIA_ROOT, 'maps')
        if not os.path.exists(basefolder):
            os.makedirs(basefolder)
        return os.path.join(basefolder, '%s-%s.png' % (self._meta.model_name, self.pk))

    def get_attributes_html(self, request):
        return extract_attributes_html(self.get_detail_url(), request)

    @classmethod
    def get_content_type_id(cls):
        try:
            return ContentType.objects.get_for_model(cls).pk
        except OperationalError:  # table is not yet created
            return None

    @property
    def creator(self):
        log_entry = LogEntry.objects.filter(
            content_type_id=self.get_content_type_id(),
            object_id=self.pk,
            action_flag=ADDITION).order_by('pk').last()
        return log_entry and log_entry.user

    @property
    def authors(self):
        return auth.get_user_model().objects.filter(
            logentry__content_type_id=self.get_content_type_id(),
            logentry__object_id=self.pk).distinct()

    @property
    def last_author(self):
        return self.authors.order_by('logentry__pk').last()

    def is_public(self):
        "Override this method to allow unauthenticated access to attachments"
        return False


class LogEntry(MapEntityMixin, BaseLogEntry):
    geom = None
    object_verbose_name = _("object")

    class Meta:
        proxy = True
        app_label = 'mapentity'

    @property
    def action_flag_display(self):
        return {
            ADDITION: _("Added"),
            CHANGE: _("Changed"),
            DELETION: _("Deleted"),
        }[self.action_flag]

    @property
    def action_time_display(self):
        return u'{0} ({1})'.format(localize(self.action_time),
                                   humanize_timesince(self.action_time))

    @property
    def object_display(self):
        model_str = u"{}".format(self.content_type)
        try:
            obj = self.get_edited_object()
            assert obj._entity, 'Unregistered model %s' % model_str
            obj_url = obj.get_detail_url()
        except (ObjectDoesNotExist, NoReverseMatch, AssertionError):
            return u'%s %s' % (model_str, self.object_repr)
        else:
            return u'<a data-pk="%s" href="%s" >%s %s</a>' % (
                obj.pk, obj_url, model_str, self.object_repr)
