Getting started
===============

In this short tutorial, we'll see how to create an app to manage museum
locations.


Database
--------

In order to use MapEntity you'll need to create a geospatial database. Feel
free to skip this section if you already know how to do this. Here is how you
can create a PostGIS database::

As user postgres, create a PostgreSQL database::

    $ createuser -PSRD museum
    Enter password for new role:
    Enter it again:
    $ createdb -O museum museum

Now enable PostGIS extension for your new database::

    $ psql -q museum
    museum=# CREATE EXTENSION postgis;


Settings
--------

Create your django Project and your main app::

   $ django-admin.py startproject museum
   $ cd museum/
   $ python manage.py startapp main  
   
If you use PostgreSQL, also install psycopg2::

   $ pip install psycopg2
    

Edit your Django settings to point to your PostGIS database::

    DATABASES = {
        'default': {
            'ENGINE': 'django.contrib.gis.db.backends.postgis',
            'NAME': 'museum',
            'USER': 'museum',
            'PASSWORD': 's3cr3t',
            'HOST': 'localhost',
            'PORT': '',
        }
    }



Add these entries to your ``INSTALLED_APPS``:

* easy_thumbnails
* djgeojson
* leaflet
* mapentity
* paperclip
* compressor
* main (the app you just created)

Add ``django.middleware.locale.LocaleMiddleware`` to your ``MIDDLEWARE_CLASSES``.

Setup your list of supported languages::

    LANGUAGES = (
        ('en', 'English'),
        ('fr', 'French'),
    )

Specify a media URL::

    MEDIA_URL = 'media/'


Add MapEntity context processor to the list of default context processors::

    TEMPLATE_CONTEXT_PROCESSORS = (
        "django.contrib.auth.context_processors.auth",
        "django.core.context_processors.debug",
        "django.core.context_processors.i18n",
        "django.core.context_processors.media",
        "django.core.context_processors.static",
        "django.core.context_processors.tz",
        "django.contrib.messages.context_processors.messages",
        'mapentity.context_processors.settings',
    )


Specify cache backends::

    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.dummy.DummyCache',
        },
        # The fat backend is used to store big chunk of data (>1 Mo)
        'fat': {
            'BACKEND': 'django.core.cache.backends.dummy.DummyCache',
        }
    }


Model
-----

Create a GeoDjango model which also inherits from ``MapEntityMixin``. Note that
you'll need to add a special manager::


    from django.contrib.gis.db import models

    from mapentity.models import MapEntityMixin


    class Museum(MapEntityMixin, models.Model):
        
        geom = models.PointField()
        name = models.CharField(max_length=80)

        objects = models.GeoManager()


Filters
-------

MapEntity requires you to define a set of filters which will be used to lookup
geographical data. Create a file ``filters.py`` in your app::

    from .models import Museum
    from mapentity.filters import MapEntityFilterSet


    class MuseumFilter(MapEntityFilterSet):

        class Meta:
            model = Museum
            fields = ('name', 'atmosphere')


Views
-----

Create a set of class-based views referring to your model and your filter::


    from mapentity.views.generic import MapEntityList
    from mapentity.views.generic import MapEntityLayer
    from mapentity.views.generic import MapEntityJsonList
    from mapentity.views.generic import MapEntityDetail
    from mapentity.views.generic import MapEntityFormat
    from .models import Museum
    from .filters import MuseumFilter


    class MuseumList(MapEntityList):

        model = Museum
        filterform = MuseumFilter
        columns = ['id', 'name', 'atmosphere']


    class MuseumLayer(MapEntityLayer):

        model = Museum


    class MuseumJsonList(MapEntityJsonList, MuseumList):
        pass


    class MuseumDetail(MapEntityDetail):

        model = Museum


    class MuseumFormat(MapEntityFormat):

        model = Museum


Admin
-----

Create a file admin.py in your main app directory and register your model
against the admin registry::

    from django.contrib import admin
    from leaflet.admin import LeafletGeoAdmin

    from .models import Museum


    admin.site.register(Museum, LeafletGeoAdmin)


URLs
----

Register your MapEntiry views in your main app ``urls.py``::

    from main.models import Museum
    from mapentity import registry


    urlpatterns = registry.register(Museum)


Then glue everything together in your project's ``urls.py``::

    from django.conf.urls import patterns, include, url
    from django.contrib import admin

    admin.autodiscover()

    urlpatterns = patterns(
        '',
        url(r'', include('mapentity.urls', namespace='mapentity',
                         app_name='mapentity')),
        url(r'^paperclip/', include('paperclip.urls')),
        url(r'', include('main.urls', namespace='main',
                         app_name='main')),
        url(r'^admin/', include(admin.site.urls)),
    )


Template
--------

Create a couple of templates inside  ``main/templates/main``.

``museum_list.html`` should just contain::

    {% extends "mapentity/entity_list.html" %}

``museum_detail`` should be just::

    {% extends "mapentity/entity_detail.html" %}


Initialize the database
-----------------------

Create a database schema based on your models::

    $ python manage.py syncdb


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
