Customization
=============


Views
-----

Create a set of class-based views. You can define only some of them. Then you
can override CBV methods as usual::

    from django.shortcuts import redirect
    from mapentity.views.generic import (
        MapEntityList, MapEntityLayer, MapEntityJsonList, MapEntityDetail,
        MapEntityFormat, MapEntityCreate, MapEntityUpdate, MapEntityDocument,
        MapEntityDelete)
    from .models import Museum


    def home(request):
        return redirect('museum_list')


    class MuseumList(MapEntityList):
        model = Museum
        columns = ['id', 'name']


    class MuseumLayer(MapEntityLayer):
        model = Museum


    class MuseumJsonList(MapEntityJsonList, MuseumList):
        pass


    class MuseumDetail(MapEntityDetail):
        model = Museum


    class MuseumFormat(MapEntityFormat, MuseumList):
        pass


    class MuseumCreate(MapEntityCreate):
        model = Museum


    class MuseumUpdate(MapEntityUpdate):
        model = Museum


    class MuseumDocument(MapEntityDocument):
        model = Museum


    class MuseumDelete(MapEntityDelete):
        model = Museum


Filters
-------

MapEntity allows you to define a set of filters which will be used to lookup
geographical data. Create a file ``filters.py`` in your app::

    from .models import Museum
    from mapentity.filters import MapEntityFilterSet


    class MuseumFilter(MapEntityFilterSet):
        class Meta:
            model = Museum
            fields = ('name', )


Then update ``views.py`` to use your custom filter in your curstom views::

    from .filters import MuseumFilter

    class MuseumList(MapEntityList):
        model = Museum
        filterform = MuseumFilter
        columns = ['id', 'name']


Forms
-----

Create a form for your Museum model::

    from mapentity.forms import MapEntityForm
    from .models import Museum

    class MuseumForm(MapEntityForm):
        class Meta:
            model = Museum
            fields =  ('name', )


Then update ``views.py`` to use your custom form in your curstom views::

    from .forms import MuseumForm

    class MuseumCreate(MapEntityCreate):
        model = Museum
        form_class = MuseumForm

    class MuseumUpdate(MapEntityUpdate):
        model = Museum
        form_class = MuseumForm


Templates
---------

Create a couple of templates inside  ``main/templates/main``.


``museum_detail.html`` can contain::

    {% extends "mapentity/mapentity_detail.html" %}
    {% load i18n mapentity_tags %}

    {% block detailspanel %}
        {{ block.super }}
        <table class="table-striped table-bordered table">
            <tr>
                <th>{{ object|verbose:"name" }}</th>
                <td>{{ object.name }}</td>
            </tr>
        </table>
    {% endblock detailspanel %}
