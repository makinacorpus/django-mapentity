Getting started
===============

In this short tutorial, we'll see how to create an app to manage museum
locations.

Settings
--------

Create your django Project and your main app::

   $ django-admin.py startproject museum
   $ cd museum/
   $ python manage.py startapp main


Edit your Django settings to point to your PostGIS database::

    DATABASES = {
        'default': {
            'ENGINE': 'django.contrib.gis.db.backends.postgis',
            'NAME': 'spatialdb',
            'USER': 'dbuser',
            'PASSWORD': 's3cr3t',
            'HOST': 'localhost',
            'PORT': '',
        }
    }



Add these entries to your ``INSTALLED_APPS``::

    'easy_thumbnails',
    'djgeojson',
    'leaflet',
    'paperclip',
    'mapentity',
    'paperclip',
    'compressor',
    'floppyforms',
    'crispy_forms',
    'rest_framework',
    'main',  # the app you just created

Add ``django.middleware.locale.LocaleMiddleware`` to your ``MIDDLEWARE_CLASSES``.

Setup your list of supported languages::

    LANGUAGES = (
        ('en', 'English'),
        ('fr', 'French'),
    )

Specify a media URL::

    MEDIA_URL = 'media/'

Specify a static root::

    import os
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    STATIC_ROOT = os.path.join(BASE_DIR, 'static')

Add MapEntity and request context processors to the list of default context
processors::

    TEMPLATE_CONTEXT_PROCESSORS = (
        "django.contrib.auth.context_processors.auth",
        "django.core.context_processors.debug",
        "django.core.context_processors.i18n",
        "django.core.context_processors.media",
        "django.core.context_processors.static",
        "django.core.context_processors.tz",
        "django.contrib.messages.context_processors.messages",
        "django.core.context_processors.request",
        "mapentity.context_processors.settings",
    )


Model
-----

Create a GeoDjango model which also inherits from ``MapEntityMixin``. Note that
you'll need to specify the *GeoDjango* manager, as below:

..code-block :: python

    from django.contrib.gis.db import models

    from mapentity.models import MapEntityMixin


    class Museum(MapEntityMixin, models.Model):

        | geom = models.PointField()
        | name = models.CharField(max_length=80)
        | objects = models.GeoManager()


Admin
-----

Create a file ``admin.py`` in the ``main`` directory and register your model
against the admin registry:

..code-block :: python


    | from django.contrib import admin
    | from leaflet.admin import LeafletGeoAdmin

    from .models import Museum

    admin.site.register(Museum, LeafletGeoAdmin)


URLs
----

Register your MapEntity views in ``main/urls.py``:

..code-block :: python

    | from main.models import Museum
    | from mapentity import registry


    urlpatterns = registry.register(Museum)


Then glue everything together in your project's ``urls.py``:

..code-block :: python

    | from django.conf.urls import patterns, include, url
    | from django.contrib import admin

    admin.autodiscover()

    urlpatterns = patterns(
        | '',
        | url(r'^$', 'main.views.home', name='home'),
        | url(r'^login/$',  'django.contrib.auth.views.login', name='login'),
        | url(r'^logout/$', 'django.contrib.auth.views.logout', name='logout',),
        | url(r'', include('mapentity.urls', namespace='mapentity', app_name='mapentity')),
        | url(r'^paperclip/', include('paperclip.urls')),
        | url(r'', include('main.urls', namespace='main', app_name='main')),
        | url(r'^admin/', include(admin.site.urls)),
    )


Initialize the database
-----------------------

Create a database schema based on your models::

    $ python manage.py syncdb

Create all permission objects with this command::

    $ python manage.py update_permissions


Start the app
-------------
::

    $ python manage.py runserver


Done!
-----

Now your should be able to visit http://127.0.0.1:8000/admin and add a museum
with a name (if you can't see a map, make sure you're using Django 1.6).

Then visit http://127.0.0.1:8000/museum/list/ and you should be able to see
your museum listed.
