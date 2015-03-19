import os
import sys
import argparse
from django.conf import settings


class QuickDjangoTest(object):
    """
    A quick way to run the Django test suite without a fully-configured
    project.

    Example usage:

        >>> QuickDjangoTest('app1', 'app2')

    Based on a script published by Lukasz Dziedzia at:
    http://stackoverflow.com/questions/3841725/how-to-launch-tests-for-django-reusable-app
    """
    DIRNAME = os.path.dirname(__file__)
    INSTALLED_APPS = (
        'django.contrib.auth',
        'django.contrib.contenttypes',
        'django.contrib.sessions',
        'django.contrib.admin',
        'django.contrib.staticfiles',
        'paperclip',
        'leaflet',
        'djgeojson',
        'compressor',
        'easy_thumbnails',
        'crispy_forms',
        'floppyforms',
        'rest_framework',
        'embed_video',
    )

    def __init__(self, *args, **kwargs):
        self.apps = args
        self.run_tests()

    def run_tests(self):
        """
        Fire up the Django test suite developed for version 1.2
        """
        apps = [app for app in self.apps]
        apps += ['%s.tests' % app for app in self.apps]
        settings.configure(
            DATABASES={
                'default': {
                    'ENGINE':  'django.contrib.gis.db.backends.spatialite',
                    'NAME': os.path.join(self.DIRNAME, 'database.db'),
                    'USER': '',
                    'PASSWORD': '',
                    'HOST': '',
                    'PORT': '',
                }
            },
            CACHES={
                'default': {
                    'BACKEND': 'django.core.cache.backends.db.DatabaseCache',
                    'LOCATION': 'my_cache_table',
                }
            },
            INSTALLED_APPS=self.INSTALLED_APPS + tuple(apps),
            STATIC_ROOT='.',
            STATIC_URL='/static/',
            ROOT_URLCONF='mapentity.tests.urls',
            MEDIA_URL='/media/',
            MEDIA_URL_SECURE='/media_secure/',
            MEDIA_ROOT='/tmp/',
            MIDDLEWARE_CLASSES=(
                'django.middleware.common.CommonMiddleware',
                'django.contrib.sessions.middleware.SessionMiddleware',
                'django.middleware.locale.LocaleMiddleware',
                'django.middleware.csrf.CsrfViewMiddleware',
                'django.contrib.auth.middleware.AuthenticationMiddleware',
                'django.contrib.messages.middleware.MessageMiddleware',
                'mapentity.middleware.AutoLoginMiddleware'
            ),
            TEMPLATE_CONTEXT_PROCESSORS=(
                "django.contrib.auth.context_processors.auth",
                "django.core.context_processors.debug",
                "django.core.context_processors.i18n",
                "django.core.context_processors.media",
                "django.core.context_processors.static",
                "django.core.context_processors.tz",
                "django.contrib.messages.context_processors.messages",
                "django.core.context_processors.request",
                "mapentity.context_processors.settings",
            ),
            TEMPLATE_DIRS=(
                os.path.join(self.DIRNAME, 'mapentity'),
            ),
            SRID=3857,
            COMPRESS_ENABLED=False,
            TEST=True
        )
        from django.test.simple import DjangoTestSuiteRunner
        runner = DjangoTestSuiteRunner()
        failures = runner.run_tests(self.apps, verbosity=1)
        if failures:  # pragma: no cover
            sys.exit(failures)

if __name__ == '__main__':
    """
    What do when the user hits this file from the shell.

    Example usage:

        $ python quicktest.py app1 app2

    """
    parser = argparse.ArgumentParser(
        usage="[args]",
        description="Run Django tests on the provided applications."
    )
    parser.add_argument('apps', nargs='+', type=str)
    args = parser.parse_args()
    QuickDjangoTest(*args.apps)
