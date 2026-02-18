from . import *  # NOQA
import os

DEBUG = False

ALLOWED_HOST = os.getenv("SERVER_NAME", "").split(",")
SECRET_KEY = os.getenv("SECRET_KEY", "unsafe-secret-key")
LANGUAGE_CODE = os.getenv("LANGUAGE_CODE", "en-us")
TIME_ZONE = os.getenv("TZ", "UTC")
MODELTRANSLATION_LANGUAGES = ("fr", "en", "zh-hant")

DATABASES = {
    'default': {
        'ENGINE': 'django.contrib.gis.db.backends.postgis',
        'NAME': os.getenv('POSTGRES_DB'),
        'USER': os.getenv('POSTGRES_USER'),
        'PASSWORD': os.getenv('POSTGRES_PASSWORD'),
        'HOST': os.getenv('POSTGRES_HOST'),
        'PORT': os.getenv('POSTGRES_PORT'),
    }
}

CACHE_ROOT = os.path.join(BASE_DIR, "cache")

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.memcached.PyMemcacheCache",
        "TIMEOUT": 2592000,  # 30 days
        "LOCATION": "{}:{}".format(
            os.getenv("MEMCACHED_HOST", "memcached"),
            os.getenv("MEMCACHED_PORT", "11211"),
        ),
    },
    # The fat backend is used to store big chunk of data (>1 Mo)
    "fat": {
        "BACKEND": "django.core.cache.backends.filebased.FileBasedCache",
        "LOCATION": os.path.join(CACHE_ROOT, "fat"),
        "TIMEOUT": 2592000,  # 30 days
    },
}

VECTOR_TILES_BACKEND = "vectortiles.backends.postgis"

MAPENTITY_CONFIG["GEOJSON_LAYERS_CACHE_BACKEND"] = "fat"
MAPENTITY_CONFIG["GEOJSON_PRECISION"] = 7

SESSION_ENGINE = "django.contrib.sessions.backends.file"
SESSION_FILE_PATH = os.path.join(CACHE_ROOT, "sessions")

CSRF_TRUSTED_ORIGINS = [f"https://{host}" for host in ALLOWED_HOST if host]
SESSION_COOKIE_DOMAIN = os.getenv("SERVER_NAME")

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True