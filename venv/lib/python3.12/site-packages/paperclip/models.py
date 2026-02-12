import os
import random
import string
from io import BytesIO
from pathlib import Path

from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.core.files import File
from django.core.files.base import ContentFile
from django.db import models
from django.template.defaultfilters import slugify
from django.utils.translation import gettext_lazy as _
from embed_video.fields import EmbedVideoField
from PIL import Image

from paperclip.settings import (PAPERCLIP_ENABLE_LINK, PAPERCLIP_ENABLE_VIDEO,
                                PAPERCLIP_FILETYPE_MODEL,
                                PAPERCLIP_LICENSE_MODEL,
                                PAPERCLIP_MAX_ATTACHMENT_HEIGHT,
                                PAPERCLIP_MAX_ATTACHMENT_WIDTH,
                                PAPERCLIP_RESIZE_ATTACHMENTS_ON_UPLOAD,
                                PAPERCLIP_RANDOM_SUFFIX_SIZE)
from paperclip.utils import is_an_image, mimetype

from .validators import FileMimetypeValidator


class FileType(models.Model):
    type = models.CharField(max_length=128, verbose_name=_("File type"))

    class Meta:
        abstract = True
        verbose_name = _("File type")
        verbose_name_plural = _("File types")
        ordering = ['type']

    @classmethod
    def objects_for(cls, request):
        # request ignored by default
        return cls.objects.all()

    def __str__(self):
        return self.type


class License(models.Model):

    label = models.CharField(max_length=128, verbose_name=_("License name"), null=False, blank=False, unique=True)

    def __str__(self):
        return self.label

    class Meta:
        abstract = True
        verbose_name = _("Attachment license")
        verbose_name_plural = _("Attachment licenses")
        ordering = ['label']


class AttachmentManager(models.Manager):
    def attachments_for_object(self, obj):
        object_type = ContentType.objects.get_for_model(obj)
        return self.filter(content_type__pk=object_type.id,
                           object_id=obj.id)

    def attachments_for_object_only_type(self, obj, filetype):
        object_type = ContentType.objects.get_for_model(obj)
        return self.filter(content_type__pk=object_type.id,
                           object_id=obj.id,
                           filetype=filetype)


def random_suffix_regexp():
    return f"-[a-z0-9]{{{PAPERCLIP_RANDOM_SUFFIX_SIZE}}}"


def attachment_upload(instance, filename):
    _, name = os.path.split(filename)
    name, ext = os.path.splitext(name)
    name = slugify(name) + ext
    return 'paperclip/%s/%s/%s' % (
        '%s_%s' % (instance.content_object._meta.app_label,
                   instance.content_object._meta.model_name),
        instance.content_object.pk,
        name)


class Attachment(models.Model):
    objects = AttachmentManager()

    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')

    attachment_file = models.FileField(_('File'), blank=True,
                                       upload_to=attachment_upload,
                                       max_length=512,
                                       validators=[FileMimetypeValidator()])
    if PAPERCLIP_ENABLE_VIDEO:
        attachment_video = EmbedVideoField(_('Video URL'), blank=True)
    if PAPERCLIP_ENABLE_LINK:
        attachment_link = models.URLField(_('Picture URL'), blank=True)
    filetype = models.ForeignKey(PAPERCLIP_FILETYPE_MODEL, verbose_name=_('File type'), on_delete=models.CASCADE)

    creator = models.ForeignKey(settings.AUTH_USER_MODEL,
                                related_name="created_attachments",
                                verbose_name=_('Creator'),
                                help_text=_("User that uploaded"), on_delete=models.CASCADE)
    license = models.ForeignKey(PAPERCLIP_LICENSE_MODEL,
                                verbose_name=_("License"),
                                null=True,
                                blank=True,
                                on_delete=models.SET_NULL)
    author = models.CharField(blank=True, default='', max_length=128,
                              verbose_name=_('Author'),
                              help_text=_("Original creator"))
    title = models.CharField(blank=True, default='', max_length=128,
                             verbose_name=_("Filename"),
                             help_text=_("Renames the file"))
    legend = models.CharField(blank=True, default='', max_length=128,
                              verbose_name=_("Legend"),
                              help_text=_("Details displayed"))
    starred = models.BooleanField(default=False,
                                  verbose_name=_("Starred"),
                                  help_text=_("Mark as starred"))
    is_image = models.BooleanField(editable=False, default=False, verbose_name=_("Is image"),
                                   help_text=_("Is an image file"), db_index=True)
    date_insert = models.DateTimeField(editable=False, auto_now_add=True,
                                       verbose_name=_("Insertion date"))
    date_update = models.DateTimeField(editable=False, auto_now=True,
                                       verbose_name=_("Update date"))
    random_suffix = models.CharField(null=False, blank=True, default='', max_length=128)

    def save(self, *args, **kwargs):
        force_refresh_suffix = kwargs.pop("force_refresh_suffix", False)
        if self.attachment_file:
            basename = kwargs.pop("basename", None)
            self.is_image = self.is_an_image()
            if not self.pk or force_refresh_suffix:
                self.random_suffix = None
                name = self.prepare_file_suffix(basename=basename)
                self.attachment_file.name = attachment_upload(self, name)
        if not kwargs.pop("skip_file_save", False) and PAPERCLIP_RESIZE_ATTACHMENTS_ON_UPLOAD and self.attachment_file and self.is_image and 'svg' not in mimetype(self.attachment_file).split('/')[-1]:
            # Resize image
            image = Image.open(self.attachment_file).convert('RGB')
            image.thumbnail((PAPERCLIP_MAX_ATTACHMENT_WIDTH, PAPERCLIP_MAX_ATTACHMENT_HEIGHT))
            # Write resized image
            output = BytesIO()
            ext = Path(self.attachment_file.name).suffix.split('.')[-1]  # JPEG, PNG..
            if ext == 'jpg' or ext == 'JPG':  # PIL does not know JPGs are JPEGs
                ext = 'jpeg'
            image.save(output, format=ext)
            output.seek(0)
            # Replace attachment
            content_file = ContentFile(output.read())
            f = File(content_file)
            name = self.prepare_file_suffix(basename=basename)
            self.attachment_file.name = attachment_upload(self, name)
            self.attachment_file.save(name, f, save=False)
        super().save(*args, **kwargs)

    class Meta:
        abstract = True
        ordering = ['-date_insert']
        verbose_name = _("Attachment")
        verbose_name_plural = _("Attachments")
        default_permissions = ()
        permissions = (
            ('add_attachment', _('Can add attachments')),
            ('change_attachment', _('Can change attachments')),
            ('delete_attachment', _('Can delete attachments')),
            ('read_attachment', _('Can read attachments')),
            ('delete_attachment_others', _("Can delete others' attachments")),
        )

    def __str__(self):
        return '{} attached {}'.format(
            self.creator.username,
            self.attachment_file.name
        )

    @property
    def filename(self):
        return os.path.split(self.attachment_file.name)[1]

    @property
    def mimetype(self):
        return mimetype(self.attachment_file)

    def is_an_image(self):
        return is_an_image(mimetype(self.attachment_file))

    def prepare_file_suffix(self, basename=None):
        """ Add random file suffix and return new filename to use in attachment_file.save
        """
        if self.attachment_file or basename:
            if not self.random_suffix:
                # Create random suffix
                # #### /!\ If you change this line, make sure to update 'random_suffix_regexp' method above
                self.random_suffix = '-' + ''.join(random.choices(string.ascii_lowercase + string.digits, k=PAPERCLIP_RANDOM_SUFFIX_SIZE))
                # #### /!\ If you change this line, make sure to update 'random_suffix_regexp' method above
                if basename:
                    _, basename = os.path.split(basename)
                    basename, ext = os.path.splitext(basename)
                else:
                    _, name = os.path.split(self.attachment_file.name)
                    name, ext = os.path.splitext(name)
                subfolder = '%s/%s' % (
                    '%s_%s' % (self.content_object._meta.app_label,
                               self.content_object._meta.model_name),
                    self.content_object.pk)
                # Compute maximum size left for filename
                max_filename_size = self._meta.get_field('attachment_file').max_length - len('paperclip/') - PAPERCLIP_RANDOM_SUFFIX_SIZE - len(subfolder) - len(ext) - 1
                # In case PAPERCLIP_RANDOM_SUFFIX_SIZE is too big
                max_filename_size = max(0, max_filename_size)
                # Create new name with suffix and proper size
                name = slugify(basename or self.title or name)[:max_filename_size]
                return name + self.random_suffix + ext
            _, name = os.path.split(self.attachment_file.name)
            return name
        return None
