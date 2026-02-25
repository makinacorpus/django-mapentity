Widgets
=======

MapWidget
---------

``MapWidget`` is the main Django form widget for rendering interactive MapLibre GL JS
maps with geometry editing capabilities via the Geoman drawing plugin.

It is automatically assigned to all ``GeometryField`` fields in ``MapEntityForm``
subclasses, but can also be used explicitly in form ``Meta.widgets`` for fine-grained
control.

Basic usage
'''''''''''

In most cases you don't need to configure ``MapWidget`` at all — ``MapEntityForm``
handles everything automatically::

    from mapentity.forms import MapEntityForm
    from .models import Museum

    class MuseumForm(MapEntityForm):
        class Meta:
            model = Museum
            fields = ('name', 'geom')

Options reference
'''''''''''''''''

All options are passed via the ``attrs`` dict or as named constructor parameters.

``geom_type`` *(str)*
    OGC geometry type that determines which drawing tools are available.

    Accepted values: ``"POINT"``, ``"LINESTRING"``, ``"POLYGON"``,
    ``"MULTIPOINT"``, ``"MULTILINESTRING"``, ``"MULTIPOLYGON"``,
    ``"GEOMETRYCOLLECTION"``, ``"GEOMETRY"``.

    Default: ``"GEOMETRY"`` (all tools enabled).

    Can be passed as a constructor parameter or via ``attrs``::

        # Constructor parameter
        MapWidget(geom_type="LINESTRING")

        # Via attrs
        MapWidget(attrs={"geom_type": "LINESTRING"})

    When used inside a ``MapEntityForm``, the ``geom_type`` is automatically
    inferred from the model field unless explicitly overridden.

``modifiable`` *(bool)*
    Whether the user can draw and edit the geometry. Default: ``True``.

    Automatically set to ``False`` by ``MapEntityForm`` when the current user
    lacks the ``change_geom`` permission on the model instance.

``target_map`` *(str)*
    Field name of another geometry field whose map should be reused.
    This allows rendering multiple geometry fields on the same map.

    Example: display a ``parking`` point on the same map as the main ``geom``
    field::

        class TrailForm(MapEntityForm):
            class Meta:
                model = Trail
                fields = ('name', 'geom', 'parking')
                widgets = {
                    'parking': MapWidget(
                        attrs={'target_map': 'geom'},
                        geom_type='POINT',
                    ),
                }

``custom_icon`` *(str)*
    Custom icon for Point markers. Accepts two formats:

    - **Inline SVG/HTML**: any string containing ``<`` is treated as raw SVG/HTML
      content and injected directly into the marker.
    - **Static file path**: a path relative to Django's static files directories
      (e.g. ``"myapp/icons/parking.svg"``). The file is read and its SVG content
      is injected into the marker.

    Example::

        MapWidget(attrs={
            'target_map': 'geom',
            'custom_icon': 'myapp/icons/parking.svg',
        })

``field_label`` *(str)*
    Label displayed above the drawing tool buttons. By default, the model field's
    ``verbose_name`` is used (injected automatically by ``MapEntityForm``).

    Example::

        MapWidget(attrs={'field_label': 'Parking location'})

``snapping_config`` *(dict or None)*
    Configuration for snapping (vertex attraction) to external vector tile layers.
    When set, the widget loads transparent vector tile layers on the map and wires
    up Geoman's custom snapping coordinates API so that new vertices snap to nearby
    existing geometries.

    The snapping configuration is defined **on the widget** (in the form), not on
    the model.

    Raw structure (with ``layers`` to resolve)::

        {
            "enabled": True,
            "layers": ["myapp.Road"],
            "snap_distance": 20,
        }

    The ``layers`` list uses ``"app_label.ModelName"`` notation (case-insensitive
    on the model name part). Each referenced model must be registered in the
    MapEntity registry. The widget automatically resolves these references into
    tilejson URLs at render time.

    ``snap_distance`` (default: 18) controls the pixel radius within which
    snapping is triggered.

    Example — enable snapping on a Road form::

        class RoadForm(MapEntityForm):
            class Meta:
                model = Road
                fields = ('name', 'geom')
                widgets = {
                    'geom': MapWidget(
                        geom_type='LINESTRING',
                        attrs={
                            'snapping_config': {
                                'enabled': True,
                                'layers': ['myapp.Road'],
                                'snap_distance': 20,
                            },
                        },
                    ),
                }

    You can also pass an already-resolved config (with ``snapLayers`` instead of
    ``layers``) if you need full control::

        MapWidget(attrs={
            'snapping_config': {
                'enabled': True,
                'snapDistance': 25,
                'snapLayers': [
                    {'id': 'road', 'tilejsonUrl': '/api/road/drf/roads/tilejson'},
                ],
            }
        })

``display_raw`` *(bool)*
    If ``True``, displays the raw geometry textarea alongside the map.
    Default: ``False``.

Complete example
''''''''''''''''

A form with a main geometry field with snapping, and a secondary point on the
same map with a custom icon::

    # forms.py
    from mapentity.forms import MapEntityForm
    from mapentity.widgets import MapWidget
    from .models import Trail

    class TrailForm(MapEntityForm):
        class Meta:
            model = Trail
            fields = ('name', 'geom', 'parking')
            widgets = {
                'geom': MapWidget(
                    geom_type='LINESTRING',
                    attrs={
                        'snapping_config': {
                            'enabled': True,
                            'layers': ['myapp.Trail', 'myapp.Road'],
                            'snap_distance': 25,
                        },
                    },
                ),
                'parking': MapWidget(
                    attrs={
                        'target_map': 'geom',
                        'custom_icon': 'myapp/icons/parking.svg',
                        'field_label': 'Parking',
                    },
                    geom_type='POINT',
                ),
            }

With this setup:

- The main ``geom`` field renders a map with LineString drawing tools and
  snapping enabled (vertices snap to existing Trail and Road geometries).
- The ``parking`` field shares the same map and uses a custom SVG icon for
  its Point marker.
- The snapping configuration is resolved automatically by the widget — layer
  references like ``"myapp.Trail"`` are converted to tilejson URLs via the
  MapEntity registry.


HiddenGeometryWidget
--------------------

``HiddenGeometryWidget`` renders a geometry field as a hidden HTML input.
It handles WKT-to-geometry conversion on form submission and reprojects
to ``API_SRID`` before serialization.

This widget is used internally and is not typically configured directly.


SelectMultipleWithPop
---------------------

``SelectMultipleWithPop`` extends Django's ``SelectMultiple`` widget with a
"+" button that opens a popup for adding new related objects.

Constructor parameter:

``add_url`` *(str)*
    URL of the popup form for creating a new related object.

Example::

    from mapentity.widgets import SelectMultipleWithPop

    class MyForm(forms.ModelForm):
        class Meta:
            widgets = {
                'tags': SelectMultipleWithPop(add_url='/tags/add/'),
            }
