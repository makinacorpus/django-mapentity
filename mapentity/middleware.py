import logging

from django.conf import settings
from django.contrib.auth import get_user_model, login

from .settings import app_settings
from .tokens import TokenManager

logger = logging.getLogger(__name__)


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
        if request.user.is_anonymous:
            auth_token = request.GET.get("auth_token")
            if auth_token:
                internal_user = get_internal_user()
                if TokenManager.verify_token(auth_token):
                    login(request, internal_user)
                    request.user = internal_user
                    logger.info(f"authenticated {auth_token}")
                    # token is deleted after one authentication
                    TokenManager.delete_token(auth_token)
                else:
                    logger.warning(f"not authenticated {auth_token}")
        return self.get_response(request)
