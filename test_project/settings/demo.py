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

SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
