import logging
import socket
from urllib.parse import urlparse

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.signals import user_logged_in
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.db import DatabaseError
from netifaces import interfaces, ifaddresses, AF_INET

from .settings import app_settings

logger = logging.getLogger(__name__)


CONVERSION_SERVER_HOST = urlparse(app_settings['CONVERSION_SERVER']).hostname
CAPTURE_SERVER_HOST = urlparse(app_settings['CAPTURE_SERVER']).hostname
AUTOLOGIN_IPS = [
    socket.gethostbyname(CONVERSION_SERVER_HOST),
    socket.gethostbyname(CAPTURE_SERVER_HOST),
]
for interface in interfaces():
    for link in ifaddresses(interface).get(AF_INET, []):
        AUTOLOGIN_IPS.append(link['addr'])


def get_internal_user():
    if not hasattr(get_internal_user, 'instance'):
        username = app_settings['INTERNAL_USER']
        User = get_user_model()

        internal_user, created = User.objects.get_or_create(
            username=username,
            defaults={'password': settings.SECRET_KEY,
                      'is_active': True,
                      'is_staff': False}
        )

        get_internal_user.instance = internal_user
    return get_internal_user.instance


def clear_internal_user_cache():
    if hasattr(get_internal_user, 'instance'):
        del get_internal_user.instance


class AutoLoginMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if "HTTP_X_FORWARDED_FOR" in request.META:
            request.META["HTTP_X_PROXY_REMOTE_ADDR"] = request.META["REMOTE_ADDR"]
            parts = request.META["HTTP_X_FORWARDED_FOR"].split(",", 1)
            request.META["REMOTE_ADDR"] = parts[0]

        useragent = request.META.get('HTTP_USER_AGENT', '')
        if useragent:
            request.META['HTTP_USER_AGENT'] = useragent.replace('FrontendTest', '')
        is_running_tests = ('FrontendTest' in useragent or getattr(settings, 'TEST', False))

        user = getattr(request, 'user', None)

        if user and user.is_anonymous and not is_running_tests:
            context = request.GET.get("context")
            auth_token = context.get("auth_token", None)
            print(f"{context=}")
            print(f"{auth_token=}")
            # remoteip = request.META.get('REMOTE_ADDR')
            # if remoteip in AUTOLOGIN_IPS:
            if PasswordResetTokenGenerator().check_token(get_internal_user(), auth_token):
                user = get_internal_user()
                try:
                    user_logged_in.send(self, user=user, request=request)
                except DatabaseError as exc:
                    print(exc)
                request.user = user

        return self.get_response(request)
