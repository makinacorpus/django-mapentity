Getting started
===============

Database
--------

Create a PostGIS database 

Settings
--------

Edit your Django settings to point to your PostGIS database.

Add these apps to your ``INSTALLED_APPS``:

* leaflet
* mapentity
* paperclip
* compressor

Add ``django.middleware.locale.LocaleMiddleware`` to your ``MIDDLEWARE_CLASSES``.

Setup your list of supported languages::

    LANGUAGES = (
        ('en', gettext_noop('English')),
        ('fr', gettext_noop('French')),
    )

Model
-----

Create a GeoDjango model which also inherits from ``MapEntityMixin``. Note that
you'll need to add a special manager::


    from django.contrib.gis.db import models

    from mapentity.models import MapEntityMixin


    class Bistro(MapEntityMixin, models.Model):
        
        geom = models.PointField()
        name = models.CharField(max_length=80)
        atmosphere = models.CharField(max_length=80)

        objects = models.GeoManager()


Filter
------

Create a file ``filters.py`` in your app::

    from .models import Bistro
    from mapentity.filters import MapEntityFilterSet


    class BistroFilter(MapEntityFilterSet):

        class Meta:
            model = Bistro
            fields = ('name', 'atmosphere')


Views
-----

Create a set of class-based views referring to your model and your filter::


    from mapentity.views.generic import MapEntityList
    from mapentity.views.generic import MapEntityLayer
    from mapentity.views.generic import MapEntityJsonList
    from mapentity.views.generic import MapEntityDetail
    from mapentity.views.generic import MapEntityFormat
    from .models import Bistro
    from .filters import BistroFilter


    class BistroList(MapEntityList):

        model = Bistro
        filterform = BistroFilter
        columns = ['id', 'name', 'atmosphere']


    class BistroLayer(MapEntityLayer):

        model = Bistro


    class BistroJsonList(MapEntityJsonList, BistroList):
        pass


    class BistroDetail(MapEntityDetail):

        model = Bistro


    class BistroFormat(MapEntityFormat):

        model = Bistro


Admin
-----

Register your model against the admin registry::

    from django.contrib import admin
    from leaflet.admin import LeafletGeoAdmin

    from .models import Bistro


    admin.site.register(Bistro, LeafletGeoAdmin)


URLs
----

Register your MapEntiry views in your app::

    from core.models import Bistro
    from mapentity import registry


    urlpatterns = registry.register(Bistro)


Then plug glue everything together in your project's ``urls.py``::

    from django.conf.urls import patterns, include, url

    from django.contrib import admin
    admin.autodiscover()

    urlpatterns = patterns(
        '',
        url(r'', include('mapentity.urls', namespace='mapentity',
                         app_name='mapentity')),
        url(r'^paperclip/', include('paperclip.urls')),
        url(r'', include('core.urls', namespace='core',
                         app_name='core')),
        url(r'^admin/', include(admin.site.urls)),
    )
