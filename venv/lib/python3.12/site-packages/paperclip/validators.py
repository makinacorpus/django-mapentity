from pathlib import PurePath
import magic
import mimetypes
from django.core.exceptions import ValidationError
from django.utils.deconstruct import deconstructible
from django.utils.translation import gettext_lazy as _

from paperclip.settings import PAPERCLIP_ALLOWED_EXTENSIONS, PAPERCLIP_EXTRA_ALLOWED_MIMETYPES


@deconstructible
class FileValidator:
    def __eq__(self, other):
        return (
            isinstance(other, self.__class__) and self.message == other.message
        )


class FileMimetypeValidator(FileValidator):
    message_extension = _(
        'File type “%(extension)s” is not allowed. '
        'Allowed types are: %(allowed_extensions)s.'
    )
    message_mimetype = _(
        'File mime type “%(mimetype)s” is not allowed for “%(extension)s”.'
    )

    def __call__(self, value):
        if PAPERCLIP_ALLOWED_EXTENSIONS is not None:
            value.seek(0)
            extension = PurePath(value.name).suffix.lower().strip('.')
            if extension not in PAPERCLIP_ALLOWED_EXTENSIONS:
                raise ValidationError(
                    self.message_extension,
                    params={
                        'extension': extension,
                        'allowed_extensions': PAPERCLIP_ALLOWED_EXTENSIONS,
                        'value': value.name,
                    }
                )
            file_mimetype = magic.from_buffer(value.read(), mime=True)
            file_mimetype_allowed = f".{extension}" in mimetypes.guess_all_extensions(file_mimetype)
            file_mimetype_allowed = file_mimetype_allowed or PAPERCLIP_EXTRA_ALLOWED_MIMETYPES.get(extension, False) and file_mimetype in PAPERCLIP_EXTRA_ALLOWED_MIMETYPES.get(extension)
            if not file_mimetype_allowed:
                raise ValidationError(
                    self.message_mimetype,
                    params={
                        'mimetype': file_mimetype,
                        'extension': extension,
                        'value': value.name,
                    }
                )
