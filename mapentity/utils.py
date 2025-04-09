from hashlib import sha256

from django.contrib.auth import get_user_model
from django.core.cache import cache

from mapentity.settings import app_settings


def get_internal_user():
    User = get_user_model()
    cache_key = sha256(app_settings['INTERNAL_USER'].encode()).hexdigest()

    internal_user = None

    cached_value = cache.get(cache_key)
    if cached_value is not None:
        user_id = int(cached_value)
        try:
            internal_user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            pass

    if not internal_user:
        internal_user, created = User.objects.update_or_create(
            username=app_settings['INTERNAL_USER'],
            defaults={
                'password': '',
                'is_active': True,
                'is_staff': False,
                'is_superuser': False,
                'email': '',
                'first_name': "Don't",
                'last_name': "delete me",
            }
        )
        cache.set(cache_key, internal_user.pk)
    return internal_user
