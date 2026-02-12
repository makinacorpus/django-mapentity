from django.contrib.contenttypes.admin import GenericStackedInline
from paperclip import settings


class AttachmentInlines(GenericStackedInline):
    model = settings.get_attachment_model()
    extra = 1
