from . import *  # NOQA

DEBUG = False

ALLOWED_HOST = os.getenv("SERVER_NAME", "").split(",")

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

CSRF_TRUSTED_ORIGINS = [f"https://{host}" for host in ALLOWED_HOST if host]
SESSION_COOKIE_DOMAIN = os.getenv("SERVER_NAME")

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True