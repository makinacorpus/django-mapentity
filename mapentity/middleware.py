import logging
from urlparse import urlparse

from django.conf import settings
from django.contrib.auth import get_user_model

from . import app_settings


logger = logging.getLogger(__name__)

CONVERSION_SERVER_HOST = urlparse(app_settings['CONVERSION_SERVER']).hostname
CAPTURE_SERVER_HOST = urlparse(app_settings['CAPTURE_SERVER']).hostname


def get_internal_user():
    if not hasattr(get_internal_user, 'instance'):
        username = app_settings['INTERNAL_USER']
        try:
            User = get_user_model()
            internal_user = User.objects.get(username=username)
        except User.DoesNotExist:
            internal_user = User(username=username,
                                 password=settings.SECRET_KEY)
            internal_user.is_active = False
            internal_user.is_staff = False
            internal_user.save()
            get_internal_user.instance = internal_user
    return get_internal_user.instance


class AutoLoginMiddleware(object):
    """
    This middleware enables auto-login for Conversion and Capture servers.

    We could have deployed implemented authentication in ConvertIt and
    django-screamshot, or deployed OpenId, or whatever. But this was a lot
    easier.
    """
    def process_request(self, request):
        user = getattr(request, 'user', None)
        if user and user.is_anonymous():
            remoteip = request.META.get('REMOTE_ADDR')
            remotehost = request.META.get('REMOTE_HOST')
            is_allowed = (
                (remoteip and remoteip in (CONVERSION_SERVER_HOST,
                                           CAPTURE_SERVER_HOST))
                or
                (remotehost and remotehost in (CONVERSION_SERVER_HOST,
                                               CAPTURE_SERVER_HOST)))
            if is_allowed:
                logger.debug("Auto-login for %s/%s" % (remoteip, remotehost))
                request.user = get_internal_user()
        return None
