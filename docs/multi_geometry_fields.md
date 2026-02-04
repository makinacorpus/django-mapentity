# Multi-Geometry Fields Support

This document explains how to use multiple geometry fields on the same map in Django Mapentity.

## Overview

Django Mapentity now supports managing multiple geometric fields on a single map, allowing users to edit different geometries (e.g., a polygon for a building footprint and a point for a parking location) within the same form.

## Features

- **Single Map Interface**: All geometry fields share the same map instance
- **Field Selector Control**: UI control to switch between geometry fields
- **Independent Geometry Data**: Each field maintains its own geometry data
- **Dynamic Controls**: Drawing controls update based on the active field's geometry type
- **Automatic Configuration**: Secondary fields automatically target the primary field's map

## Basic Usage

### 1. Define Your Model

Create a model with multiple geometry fields:

```python
from django.contrib.gis.db import models
from mapentity.models import MapEntityMixin

class Supermarket(MapEntityMixin, models.Model):
    geom = models.PolygonField(null=True, default=None, srid=2154)
    parking = models.PointField(null=True, default=None, srid=2154)
    tag = models.ForeignKey(Tag, null=True, default=None, on_delete=models.SET_NULL)
```

### 2. Create a Form

Define a form with the `geomfields` attribute listing all geometry fields:

```python
from mapentity.forms import MapEntityForm

class SupermarketForm(MapEntityForm):
    geomfields = ["geom", "parking"]  # List all geometry fields

    class Meta:
        model = Supermarket
        fields = ("geom", "parking", "tag")
```

### 3. Register Views and URLs

Create views and register them following the standard Mapentity pattern:

```python
from mapentity import views as mapentity_views

class SupermarketList(mapentity_views.MapEntityList):
    model = Supermarket

class SupermarketCreate(mapentity_views.MapEntityCreate):
    model = Supermarket
    form_class = SupermarketForm

class SupermarketUpdate(mapentity_views.MapEntityUpdate):
    model = Supermarket
    form_class = SupermarketForm
```

Register in your URLs:

```python
from mapentity.registry import registry

urlpatterns = registry.register(Supermarket)
```

## How It Works

### Architecture

1. **Primary Field**: The first field in `geomfields` creates the map instance
2. **Secondary Fields**: Subsequent fields use `target_map` to reference the primary field's map
3. **Multi-Field Manager**: A `MaplibreMultiFieldManager` coordinates all fields
4. **Shared Draw Manager**: All fields share a single `MaplibreDrawControlManager` instance
5. **Field Selector UI**: Buttons appear to switch between fields

### JavaScript Components

#### MaplibreMultiFieldManager

Manages multiple geometry fields on the same map:

```javascript
// Automatically initialized when multiple geometry fields are detected
const manager = new MaplibreMultiFieldManager(map);

// Register fields
manager.registerField(field1);
manager.registerField(field2);

// Switch active field
manager.setActiveField('id_parking');
```

#### MaplibreGeometryField

Each geometry field creates an instance:

```javascript
const field = new MaplibreGeometryField(map, 'id_geom', {
    modifiable: true,
    geomType: 'Polygon'
});
```

When a multi-field manager exists, the field automatically:
- Uses the shared draw manager
- Registers itself with the manager
- Responds to activation/deactivation events

### Field Selector Control

When multiple fields are present, a field selector control appears in the top-left corner:

```
┌─────────────────┐
│ Editing:        │
│ ┌─────────────┐ │
│ │ Geom        │ │ (active - blue background)
│ └─────────────┘ │
│ ┌─────────────┐ │
│ │ Parking     │ │
│ └─────────────┘ │
└─────────────────┘
```

Click a button to switch to editing that field.

## Customization

### Custom Field Labels

Field labels in the selector are automatically generated from field names. To customize, you can:

1. Use descriptive field names in your model
2. Modify the `_getFieldLabel` method in `MaplibreMultiFieldManager`

### Custom Icons

To add custom icons for markers or controls (future enhancement):

```python
class SupermarketForm(MapEntityForm):
    geomfields = ["geom", "parking"]
    
    # Future feature - not yet implemented
    geomfield_config = {
        'parking': {
            'icon': 'parking-icon.png',
            'color': '#0000FF',
        }
    }
```

## Technical Details

### Automatic target_map Configuration

The `MapEntityForm` automatically configures `target_map` for secondary fields:

```python
# In MapEntityForm.__init__
if len(self.geomfields) > 1 and fieldname != self.geomfields[0]:
    formfield.widget.attrs["target_map"] = self.geomfields[0]
```

### Event Routing

Events from Geoman (draw, edit, delete) are processed by each field independently:

1. User clicks a drawing control
2. Geoman fires an event (e.g., `gm:create`)
3. All registered fields receive the event
4. Each field processes only events for its own features

### Data Storage

Each field maintains:
- `gmEvents`: Array of feature events for this field
- `fieldStore`: Link to the hidden textarea for this field
- Independent geometry data saved to its respective form field

## Limitations and Future Enhancements

### Current Limitations

1. **Control Visibility**: Controls update when switching fields, but all controls share the same position
2. **Feature Styling**: All fields use the same default styling
3. **Icon Customization**: Custom icons per field not yet implemented

### Planned Enhancements

1. **Custom Styling**: Allow different colors/styles per field
2. **Custom Icons**: Support for custom marker icons per field
3. **Separate Control Groups**: Option to have separate control UI per field
4. **Field Visibility Toggle**: Show/hide features from specific fields
5. **Validation**: Cross-field geometry validation (e.g., parking must be within supermarket bounds)

## Testing

Unit tests verify the multi-field functionality:

```python
from django.test import TestCase

class SupermarketFormTest(TestCase):
    def test_multiple_geometry_fields(self):
        """Test that SupermarketForm correctly handles multiple geometry fields"""
        from test_app.forms import SupermarketForm
        
        form = SupermarketForm()
        
        # Both geometry fields should be present
        self.assertIn('geom', form.fields)
        self.assertIn('parking', form.fields)
        
        # Check geomfields configuration
        self.assertEqual(form.geomfields, ['geom', 'parking'])
```

## Troubleshooting

### Fields Not Appearing

**Problem**: Secondary geometry field doesn't appear on the map.

**Solution**: Ensure:
1. `geomfields` includes all geometry field names
2. Fields are listed in the form's Meta.fields
3. JavaScript console shows no errors about MaplibreMultiFieldManager

### Drawing Controls Not Updating

**Problem**: Drawing controls don't change when switching fields.

**Solution**: This may indicate an incompatible Geoman version. Check console for warnings about missing refresh methods.

### Events Not Saving

**Problem**: Drawings on secondary field don't save.

**Solution**: Verify that:
1. The `target_map` attribute is set correctly
2. The secondary field's textarea element exists in the DOM
3. No JavaScript errors in the console

## Examples

### Example 1: Building with Parking

```python
class Building(MapEntityMixin, models.Model):
    """A building with its footprint and parking area"""
    footprint = models.PolygonField(srid=2154)
    parking_area = models.PolygonField(null=True, blank=True, srid=2154)
    main_entrance = models.PointField(null=True, blank=True, srid=2154)

class BuildingForm(MapEntityForm):
    geomfields = ["footprint", "parking_area", "main_entrance"]
    
    class Meta:
        model = Building
        fields = "__all__"
```

### Example 2: Trail with Waypoints

```python
class Trail(MapEntityMixin, models.Model):
    """A hiking trail with waypoints"""
    path = models.LineStringField(srid=2154)
    trailhead = models.PointField(srid=2154)
    scenic_viewpoint = models.PointField(null=True, blank=True, srid=2154)

class TrailForm(MapEntityForm):
    geomfields = ["path", "trailhead", "scenic_viewpoint"]
    
    class Meta:
        model = Trail
        fields = "__all__"
```

## Migration Guide

### Migrating Existing Forms

To add multi-geometry support to an existing model:

1. Add new geometry fields to your model:
   ```python
   new_field = models.PointField(null=True, blank=True, srid=2154)
   ```

2. Create and run migrations:
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

3. Update your form to include the new field in `geomfields`:
   ```python
   geomfields = ["existing_geom", "new_field"]
   ```

4. Update your form's Meta.fields to include the new field

That's it! The multi-field manager will automatically handle the rest.

## Browser Compatibility

Multi-geometry field support works in all modern browsers that support:
- MapLibre GL JS
- ES6 JavaScript features
- CSS Grid (for field selector layout)

Tested browsers:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
