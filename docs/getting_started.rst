Getting started
===============

Create a PostGIS database and edit your Django settings to point to that database.

Add mapentity and paperclip to your list of ``INSTALLED_APPS``.

Create a GeoDjango model which also inherits from ``MapEntityMixin``::


    from django.contrib.gis.db import models

    from mapentity.models import MapEntityMixin


    class Bistro(MapEntityMixin, models.Model):
        
        geom = models.PointField()


Create a class-based view that points to your model::


    from mapentity.views.generic import MapEntityList
    from .models import Bistro


    class BistroList(MapEntityList):

        model = Bistro


Now plug your view in your project's ``urls.py``::

    from core.models import Bistro
    from mapentity import registry

    urlpatterns = registry.register(Bistro)
