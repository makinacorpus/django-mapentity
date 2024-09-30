Customization
=============


Views
-----

Create a set of class-based views. You can define only some of them. Then you
can override CBV methods as usual::


    from django.shortcuts import redirect
    from mapentity.views.generic import (
        MapEntityList, MapEntityDetail,
        MapEntityFormat, MapEntityCreate, MapEntityUpdate, MapEntityDocument,
        MapEntityDelete, MapEntityViewSet)
    from .models import Museum
    from .serializers import MuseumSerializer


    def home(request):
        return redirect('museum_list')


    class MuseumList(MapEntityList):
        model = Museum
        columns = ['id', 'name']


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


    class MuseumViewSet(MapEntityViewSet):
        model = Museum
        serializer_class = MuseumSerializer



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

To display information accordingly to your Museum model, you can create a template in ``main/templates/main``.


``museum_detail_attributes.html`` can contain::

    {% extends "mapentity/mapentity_detail_attributes.html" %}
    {% load i18n mapentity_tags %}

    {% block attributes %}
        <table class="table-striped table-bordered table">
            <tr>
                <th>{{ object|verbose:"name" }}</th>
                <td>{{ object.name }}</td>
            </tr>
        </table>
        {{ block.super }}
    {% endblock attributes %}

You can override the detail view template for your Museum model by creating a ``museum_detail.html`` in the same directory as before.

Exports
---------

There is another export system in MapEntity which use `Weasyprint` (http://weasyprint.org/).

Instead of using ODT templates, Weasyprint use HTML/CSS and export to PDF.
Do not use this system if you need an ODT or DOC export.

Although Weasyprint export only to PDF, there are multiple advantages to it, such as :
    - Use the power of HTML/CSS to generate your pages (far simpler than the ODT template)
    - Use the Django template system to generate PDF content
    - No longer need an instance of convertit to convert ODT to PDF and svg to png

To use MapEntity with Weasyprint, you just need to activate it in the ``settings.py`` of MapEntity.

Replace::

    'MAPENTITY_WEASYPRINT': False,

by::

    'MAPENTITY_WEASYPRINT': True,


If you want to include images that are not SVG or PNG, you will need to install GDK-PixBuf

    sudo apt-get install libgdk-pixbuf2.0-dev


Now, you can customize the templates used to export your model in two different ways.

First one is to create a template for a model only.

    In your museum project, you can override the CSS used to style the export by creating a file named ``museum_detail_pdf.css`` in ``main/templates/main``.
    Refer to the CSS documentation and ``mapentity_detail_pdf.css``.

    Note that, in the ``mapentity_detail_pdf.html``, the CSS file is included instead of linked to take advantage of the Django template generation.

    Same as the CSS, you can override mapentity_detail_pdf.html by creating a file named ``musuem_detail_pdf.html``.
    Again, refer to ``mapentity_detail_pdf.html``.

    If you create another model and need to override his template, the template should be of the form ``templates/appname/modelname_detail_pdf.html`` with appname the name of your Django app and modelname the name of your model.

The second way overrides these templates for all your models.

    you need to create a sub-directory named ``mapentity`` in ``main/templates``.
    Then you can create a file named ``override_detail_pdf.html``(or ``.css``) and it will be used for all your models if a specific template is not provided.


Settings
-----------

Media
'''''

Attached files are downloaded by default by browser, with the following line,
files will be opened in the browser :

.. code-block:: python

    MAPENTITY_CONFIG['SERVE_MEDIA_AS_ATTACHMENT'] = False


Paperclip medias (under ``/paperclip/<app>_<model>/<pk>/<name>.**``) are protected by mapentity.
We use easy_thumbnail to generate thumbnails of pictures.
These files are generated with a new name with all the characteristics of the thumbnail generated (crop or not, width, height, etc...).
These files need to be protected as the parent picture. We use a regex to find the parent's picture and all the permissions on this picture.

You can change the regex, for example if you need to add other behaviour with easy_thumbnail :

.. code-block:: python

    MAPENTITY_CONFIG['REGEX_PATH_ATTACHMENTS'] = r'\.\d+x\d+_q\d+(_crop)?\.(jpg|png|jpeg)$'


Maps
''''

All layers colors can be customized from the settings.
See `Leaflet reference <http://leafletjs.com/reference.html#path>`_ for vectorial
layer style.

The styles are loaded in leaflet map in js and can be use with window.SETTINGS.map.styles


.. code-block:: python

    MAPENTITY_CONFIG['MAP_STYLES'][key] = {'color': 'red', 'weight': 5}

Or change just one parameter (the opacity for example) :

.. code-block:: python

    MAPENTITY_CONFIG['MAP_STYLES'][key]['opacity'] = 0.8


Edition
'''''''

For rich text fields, it is possible to indicate a max number of characters on a specified field (spaces included).  
A help message will be added, and color of TinyMCE status bar and border will be colored in red when max number of characters reached.

.. code-block:: python

    MAPENTITY_CONFIG['MAX_CHARACTERS_BY_FIELD'] = { 
        "tourism_touristicevent": [{'field': 'description_teaser_fr', 'value': 50}, {'field': 'accessibility_fr', 'value': 25}],
        "trekking_trek": [{'field': 'description_teaser_fr', 'value': 150}],
    }
