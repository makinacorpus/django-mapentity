from django.apps import apps
from django.conf import settings


PAPERCLIP_ENABLE_VIDEO = getattr(settings, 'PAPERCLIP_ENABLE_VIDEO', False)
PAPERCLIP_ENABLE_LINK = getattr(settings, 'PAPERCLIP_ENABLE_LINK', False)
PAPERCLIP_ACTION_HISTORY_ENABLED = getattr(settings, 'PAPERCLIP_ACTION_HISTORY_ENABLED', True)
PAPERCLIP_FILETYPE_MODEL = settings.PAPERCLIP_FILETYPE_MODEL
PAPERCLIP_ATTACHMENT_MODEL = settings.PAPERCLIP_ATTACHMENT_MODEL
PAPERCLIP_LICENSE_MODEL = settings.PAPERCLIP_LICENSE_MODEL
PAPERCLIP_MAX_ATTACHMENT_WIDTH = getattr(settings, 'PAPERCLIP_MAX_ATTACHMENT_WIDTH', 1280)
PAPERCLIP_MAX_ATTACHMENT_HEIGHT = getattr(settings, 'PAPERCLIP_MAX_ATTACHMENT_HEIGHT', 1280)
PAPERCLIP_ALLOWED_EXTENSIONS = getattr(settings, 'PAPERCLIP_ALLOWED_EXTENSIONS', None)
PAPERCLIP_EXTRA_ALLOWED_MIMETYPES = getattr(settings, 'PAPERCLIP_EXTRA_ALLOWED_MIMETYPES', {})
PAPERCLIP_MIN_IMAGE_UPLOAD_WIDTH = getattr(settings, 'PAPERCLIP_MIN_IMAGE_UPLOAD_WIDTH', None)
PAPERCLIP_MIN_IMAGE_UPLOAD_HEIGHT = getattr(settings, 'PAPERCLIP_MIN_IMAGE_UPLOAD_HEIGHT', None)
PAPERCLIP_RANDOM_SUFFIX_SIZE = getattr(settings, 'PAPERCLIP_RANDOM_SUFFIX_SIZE', 12)
PAPERCLIP_MAX_BYTES_SIZE_IMAGE = getattr(settings, 'PAPERCLIP_MAX_BYTES_SIZE_IMAGE', None)
PAPERCLIP_RESIZE_ATTACHMENTS_ON_UPLOAD = getattr(settings, 'PAPERCLIP_RESIZE_ATTACHMENTS_ON_UPLOAD', False)


def get_filetype_model():
    return apps.get_model(*PAPERCLIP_FILETYPE_MODEL.split('.'))


def get_attachment_model():
    return apps.get_model(*PAPERCLIP_ATTACHMENT_MODEL.split('.'))


def get_license_model():
    return apps.get_model(*PAPERCLIP_LICENSE_MODEL.split('.'))


def get_attachment_permission(action):
    model = get_attachment_model()
    return '{app}.{action}'.format(app=model._meta.app_label, action=action)
