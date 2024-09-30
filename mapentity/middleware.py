import logging
from hashlib import sha256

from django.contrib.auth import get_user_model, login
from django.core.cache import cache

from .settings import app_settings
from .tokens import TokenManager

logger = logging.getLogger(__name__)


def get_internal_user():
    User = get_user_model()
    cache_key = sha256(app_settings['INTERNAL_USER'].encode()).hexdigest()

    internal_user = None

    if cache_key in cache:
        id = int(cache.get(cache_key))
        try:
            internal_user = User.objects.get(pk=id)
        except User.DoesNotExist:
            pass

    if not internal_user:
        internal_user, created = User.objects.get_or_create(
            username=app_settings['INTERNAL_USER'],
            defaults={
                'password': '',
                'is_active': True
            }
        )
        if created:
            cache.set(cache_key, internal_user.pk)
    return internal_user


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
