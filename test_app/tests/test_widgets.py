from django.contrib.gis.geos import Point
from django.test import TestCase

from mapentity.widgets import HiddenGeometryWidget, SelectMultipleWithPop


class HiddenGeometryWidgetTestCase(TestCase):
    def test_widget_transform_if_srid(self):
        """ Widget should transform geometry to API_SRID if geos object provided """
        widget = HiddenGeometryWidget()
        output = widget.render('geometry', Point(0, 0, srid=2154))
        self.assertEqual(output, '<input type="hidden" name="geometry" value="SRID=4326;POINT (-1.363081210117898 -5.983856309208756)">')


class SelectMultipleWithPopTestCase(TestCase):
    def test_widget_rendering(self):
        widget = SelectMultipleWithPop(add_url='/add/')
        output = widget.render('select-multiple', value="value")
        self.assertIn('<select name="select-multiple" multiple>', output)
        self.assertIn('</select>', output)
        self.assertIn('href="/add/"', output)
        self.assertIn('id="add_id_select-multiple"', output)
        self.assertIn('onclick="return showAddAnotherPopup(this);"', output)
        self.assertIn('<i class="bi bi-plus"></i>', output)
