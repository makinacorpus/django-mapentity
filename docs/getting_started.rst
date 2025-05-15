Getting started
===============

In this short tutorial, we'll see how to create an app to manage museum
locations.

Settings
--------

Create your django Project and your main app::

   $ django-admin.py startproject museum
   $ cd museum/
   $ python3 manage.py startapp main


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

    'paperclip',
    'compressor',
    'easy_thumbnails',
    'crispy_forms',
    'crispy_bootstrap4',
    'rest_framework',
    'embed_video',
    'modeltranslation'
    'mapentity',  # Make sure mapentity settings are loaded before leaflet ones
    'leaflet',
    'main',  # the app you just created

Add ``django.middleware.locale.LocaleMiddleware`` to your ``MIDDLEWARE`` classes.

Setup your list of supported languages::

    LANGUAGES = (
        ('en', 'English'),
        ('fr', 'French'),
    )

Specify a media URL::

    MEDIA_URL = '/media/'

Specify a static root::

    import os
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    STATIC_ROOT = os.path.join(BASE_DIR, 'static')

Add MapEntity and request context processors to the list of default context
processors::

    TEMPLATES = [
        {
            …
            'OPTIONS': {
                …
                'context_processors': [
                    …
                    "mapentity.context_processors.settings",
                ]
            }
        }
    ]


Add the `MAPENTITY_CONFIG` variable::

    MAPENTITY_CONFIG = {}

Define a configuration for leaflet::

    LEAFLET_CONFIG = {
    'SRID': 3857,
    'TILES': [
        ('OSM', 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', '(c) OpenStreetMap Contributors'),
        ('OSM N&B', 'http://{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png', '(c) OpenStreetMap Contributors'),
    ],
    # 'SPATIAL_EXTENT': (1.3, 43.7, 1.5, 43.5),
    }


Model
-----

Create a GeoDjango model which also inherits from ``MapEntityMixin``. Note that
you'll need to specify the *GeoDjango* manager, as below:


.. code-block:: python

    from django.contrib.gis.db import models
    from mapentity.models import MapEntityMixin


    class Museum(MapEntityMixin, models.Model):
        geom = models.PointField()
        name = models.CharField(max_length=80)


Admin
-----

Create a file ``admin.py`` in the ``main`` directory and register your model
against the admin registry:

.. code-block:: python

    from django.contrib import admin
    from leaflet.admin import LeafletGeoAdmin

    from .models import Museum

    admin.site.register(Museum, LeafletGeoAdmin)


URLs
----

Register your MapEntity views in ``main/urls.py``:

.. code-block:: python

    from main.models import Museum
    from mapentity.registry import registry

    app_name = "main"


    urlpatterns = registry.register(Museum)


Then glue everything together in your project's ``urls.py``:

.. code-block:: python

    from django.conf.urls import patterns, include, url
    from django.contrib import admin
    from django.contrib.auth import views as auth_views

    admin.autodiscover()

    urlpatterns = [
        '',
        path('', RedirectView.as_view(url=reverse_lazy('main:museum_list'), permanent=True), name='home'),
        path('login/',  'django.contrib.auth.views.login', name='login'),
        path('logout/', 'django.contrib.auth.views.logout', name='logout',),
        path('', include('mapentity.urls')),
        path('paperclip/', include('paperclip.urls')),
        path('i18n/', include('django.conf.urls.i18n')),
        path('login/', auth_views.LoginView.as_view(), name='login'),
        path('logout/', auth_views.LogoutView.as_view(), {'next_page': '/'}, name='logout',),
        path('admin', admin.site.urls),
    ]


Initialize the database
-----------------------

Create a database schema based on your models::

    $ python manage.py migrate

Create all permission objects with this command::

    $ python manage.py update_permissions_mapentity


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
