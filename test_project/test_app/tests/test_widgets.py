from django.contrib.gis.geos import Point
from django.test import TestCase

from mapentity.widgets import HiddenGeometryWidget, SelectMultipleWithPop


class HiddenGeometryWidgetTestCase(TestCase):
    def test_widget_transform_if_srid(self):
        """Widget should transform geometry to API_SRID if geos object provided"""
        widget = HiddenGeometryWidget()
        geom = Point(0, 0, srid=2154)
        output = widget.render("geometry", geom)
        geom.transform(4326)
        self.assertEqual(
            output, f'<input type="hidden" name="geometry" value="{geom.ewkt}">'
        )


class SelectMultipleWithPopTestCase(TestCase):
    def test_widget_rendering(self):
        widget = SelectMultipleWithPop(add_url="/add/")
        output = widget.render("select-multiple", value="value")
        self.assertIn(
            '<select name="select-multiple" data-autocomplete-light-function="select2" data-autocomplete-light-language="en" multiple>',
            output,
        )
        self.assertIn("</select>", output)
        self.assertIn('href="/add/"', output)
        self.assertIn('id="add_id_select-multiple"', output)
        self.assertIn('onclick="return showAddAnotherPopup(this);"', output)
        self.assertIn('<i class="bi bi-plus"></i>', output)
