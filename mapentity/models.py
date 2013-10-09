import os

from django.db import models
from django.conf import settings
from django.core.exceptions import FieldError

from paperclip.models import Attachment

from . import app_settings
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
    ENTITY_UPDATE, ENTITY_DELETE,
)


class MapEntityMixin(object):

    @classmethod
    def add_property(cls, name, func):
        if hasattr(cls, name):
            return  # ignore
        setattr(cls, name, property(func))

    @classmethod
    def latest_updated(cls):
        try:
            return cls.objects.latest("date_update").date_update
        except (cls.DoesNotExist, FieldError):
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

    # List all different kind of views
    @classmethod
    def get_url_name(cls, kind):
        if not kind in ENTITY_KINDS:
            return None
        return '%s:%s_%s' % (cls._meta.app_label, cls._meta.module_name, kind)

    @classmethod
    def get_url_name_for_registration(cls, kind):
        if not kind in ENTITY_KINDS:
            return None
        return '%s_%s' % (cls._meta.module_name, kind)

    @classmethod
    @models.permalink
    def get_layer_url(cls):
        return (cls.get_url_name(ENTITY_LAYER), )

    @classmethod
    @models.permalink
    def get_list_url(cls):
        return (cls.get_url_name(ENTITY_LIST), )

    @classmethod
    @models.permalink
    def get_jsonlist_url(cls):
        return (cls.get_url_name(ENTITY_JSON_LIST), )

    @classmethod
    @models.permalink
    def get_format_list_url(cls):
        return (cls.get_url_name(ENTITY_FORMAT_LIST), )

    @classmethod
    @models.permalink
    def get_add_url(cls):
        return (cls.get_url_name(ENTITY_CREATE), )

    def get_absolute_url(self):
        return self.get_detail_url()

    @classmethod
    @models.permalink
    def get_generic_detail_url(cls):
        return (cls.get_url_name(ENTITY_DETAIL), [str(0)])

    @models.permalink
    def get_detail_url(self):
        return (self.get_url_name(ENTITY_DETAIL), [str(self.pk)])

    @property
    def attachments(self):
        return Attachment.objects.attachments_for_object(self)

    def get_geom_aspect_ratio(self):
        """ Returns a ratio with/height, limited between 0.5 and 2.
        """
        geom = self.get_geom()
        if geom:
            xmin, ymin, xmax, ymax = geom.extent
            try:
                aspect = (xmax - xmin) / (ymax - ymin)
                return max(min(2, aspect), 0.5)
            except ZeroDivisionError:
                pass
        return 1.0

    def prepare_map_image(self, rooturl):
        path = self.get_map_image_path()
        # Do nothing if image is up-to-date
        if is_file_newer(path, self.date_update):
            return
        url = smart_urljoin(rooturl, self.get_detail_url())
        capture_map_image(url, path, aspect=self.get_geom_aspect_ratio())

    def get_map_image_path(self):
        basefolder = os.path.join(settings.MEDIA_ROOT, 'maps')
        if not os.path.exists(basefolder):
            os.makedirs(basefolder)
        return os.path.join(basefolder, '%s-%s.png' % (self._meta.module_name, self.pk))

    @property
    def map_image_url(self):
        return self.get_map_image_url()

    @models.permalink
    def get_map_image_url(self):
        return (self.get_url_name(ENTITY_MAPIMAGE), [str(self.pk)])

    @models.permalink
    def get_document_url(self):
        return (self.get_url_name(ENTITY_DOCUMENT), [str(self.pk)])

    @models.permalink
    def get_update_url(self):
        return (self.get_url_name(ENTITY_UPDATE), [str(self.pk)])

    @models.permalink
    def get_delete_url(self):
        return (self.get_url_name(ENTITY_DELETE), [str(self.pk)])

    def get_attributes_html(self, rooturl):
        url = smart_urljoin(rooturl, self.get_detail_url())
        return extract_attributes_html(url)
