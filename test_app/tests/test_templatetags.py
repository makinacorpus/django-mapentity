from django.conf import settings
from django.core.exceptions import FieldDoesNotExist
from django.template import Template, Context
from django.template.exceptions import TemplateSyntaxError
from django.test import TestCase
from django.test.utils import override_settings
from django.utils import translation
from django.utils.timezone import make_aware

from ..models import DummyModel
from .factories import DummyModelFactory

from datetime import datetime
from freezegun import freeze_time
import json
import os
from tempfile import TemporaryDirectory


class ValueListTest(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        translation.deactivate()

    def test_empty_list_should_show_none(self):
        out = Template(
            '{% load mapentity_tags %}'
            '{% valuelist items %}'
        ).render(Context({
            'items': []
        }))
        self.assertEqual(out.strip(), '<span class="none">None</span>')

    def test_simple_usage_outputs_list_of_items(self):
        out = Template(
            '{% load mapentity_tags %}'
            '{% valuelist items %}'
        ).render(Context({
            'items': ['blah']
        }))
        self.assertEqual(out.strip(), """<ul>\n    <li>blah</li>\n    </ul>""")

    def test_can_specify_field_to_be_used(self):
        obj = DummyModelFactory.create(name='blah')
        out = Template(
            '{% load mapentity_tags %}'
            '{% valuelist items field="name" %}'
        ).render(Context({
            'items': [obj]
        }))
        self.assertHTMLEqual(out,
                             f"""
                             <ul><li class="hoverable" data-modelname="dummymodel" data-pk="{obj.pk}">
                             <a href="/dummymodel/1/">blah</a></li></ul>""")

    def test_can_specify_an_enumeration4(self):
        out = Template(
            '{% load mapentity_tags %}'
            '{% valuelist items enumeration=True %}'
        ).render(Context({
            'items': range(1, 4)
        }))
        self.assertIn('<li><span class="enumeration-value">A.&nbsp;</span>1</li>', out)
        self.assertIn('<li><span class="enumeration-value">B.&nbsp;</span>2</li>', out)
        self.assertIn('<li><span class="enumeration-value">C.&nbsp;</span>3</li>', out)

    def test_can_specify_an_enumeration30(self):
        out = Template(
            '{% load mapentity_tags %}'
            '{% valuelist items enumeration=True %}'
        ).render(Context({
            'items': range(1, 30)
        }))
        self.assertIn('<li><span class="enumeration-value">AA.&nbsp;</span>1</li>', out)
        self.assertIn('<li><span class="enumeration-value">AZ.&nbsp;</span>26</li>', out)
        self.assertIn('<li><span class="enumeration-value">BA.&nbsp;</span>27</li>', out)
        self.assertIn('<li><span class="enumeration-value">BB.&nbsp;</span>28</li>', out)

    def test_can_specify_an_enumeration300(self):
        out = Template(
            '{% load mapentity_tags %}'
            '{% valuelist items enumeration=True %}'
        ).render(Context({
            'items': range(1, 678)
        }))
        self.assertIn('<li><span class="enumeration-value">AAA.&nbsp;</span>1</li>', out)
        self.assertIn('<li><span class="enumeration-value">AAZ.&nbsp;</span>26</li>', out)
        self.assertIn('<li><span class="enumeration-value">ABA.&nbsp;</span>27</li>', out)
        self.assertIn('<li><span class="enumeration-value">ABB.&nbsp;</span>28</li>', out)
        self.assertIn('<li><span class="enumeration-value">BAA.&nbsp;</span>677</li>', out)


class ValueTableTest(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        translation.deactivate()

    def test_empty_objects_should_show_none(self):
        out = Template(
            '{% load mapentity_tags %}'
            '{% valuetable dummys %}'
        ).render(Context({
            'dummys': DummyModel.objects.all()
        }))
        self.assertHTMLEqual(out, '<span class="none">None</span>')

    def test_simple_usage_outputs_list_of_items(self):
        dummy = DummyModelFactory.create(name="foo")
        out = Template(
            '{% load mapentity_tags %}'
            '{% valuetable dummys "name" %}'
        ).render(Context({
            'dummys': DummyModel.objects.all()
        }))
        self.assertHTMLEqual(out,
                             f"""
                             <table class="table"><thead><tr><th class="name">name</th></tr>
                             </thead><tbody><tr class="hoverable" data-modelname="dummymodel"
                              data-pk="{dummy.pk}"><td><a href="/dummymodel/{dummy.pk}/">
                              foo</a></td></tr></tbody></table>""")


@freeze_time("2021-12-12")
class HumanizeTimesinceTest(TestCase):
    def test_no_date(self):
        out = Template(
            '{% load mapentity_tags %}'
            '{{ date|timesince }}'
        ).render(Context({
            'date': ""
        }))
        self.assertEqual(out, "")

    def test_years_ago(self):
        out = Template(
            '{% load mapentity_tags %}'
            '{{ date|timesince }}'
        ).render(Context({
            'date': make_aware(datetime(2012, 6, 1))  # Initial import of Geotrek-admin on github
        }))
        self.assertEqual(out, "9 years ago")

    def test_year_ago(self):
        out = Template(
            '{% load mapentity_tags %}'
            '{{ date|timesince }}'
        ).render(Context({
            'date': make_aware(datetime(2020, 11, 12))
        }))
        self.assertEqual(out, "1 year ago")

    def test_weeks_ago(self):
        out = Template(
            '{% load mapentity_tags %}'
            '{{ date|timesince }}'
        ).render(Context({
            'date': make_aware(datetime(2021, 6, 12))
        }))
        self.assertEqual(out, "26 weeks ago")

    def test_week_ago(self):
        out = Template(
            '{% load mapentity_tags %}'
            '{{ date|timesince }}'
        ).render(Context({
            'date': make_aware(datetime(2021, 12, 5))
        }))
        self.assertEqual(out, "1 week ago")

    def test_days_ago(self):
        out = Template(
            '{% load mapentity_tags %}'
            '{{ date|timesince }}'
        ).render(Context({
            'date': make_aware(datetime(2021, 12, 10))
        }))
        self.assertEqual(out, "2 days ago")

    def test_day_ago(self):
        out = Template(
            '{% load mapentity_tags %}'
            '{{ date|timesince }}'
        ).render(Context({
            'date': make_aware(datetime(2021, 12, 11))
        }))
        self.assertEqual(out, "1 day ago")

    def test_hours_ago(self):
        out = Template(
            '{% load mapentity_tags %}'
            '{{ date|timesince }}'
        ).render(Context({
            'date': make_aware(datetime(2021, 12, 12, 9))
        }))
        self.assertEqual(out, "15 hours ago")

    def test_hour_ago(self):
        out = Template(
            '{% load mapentity_tags %}'
            '{{ date|timesince }}'
        ).render(Context({
            'date': make_aware(datetime(2021, 12, 12, 23))
        }))
        self.assertEqual(out, "1 hour ago")

    def test_minutes_ago(self):
        out = Template(
            '{% load mapentity_tags %}'
            '{{ date|timesince }}'
        ).render(Context({
            'date': make_aware(datetime(2021, 12, 12, 23, 55))
        }))
        self.assertEqual(out, "5 minutes ago")

    def test_minute_ago(self):
        out = Template(
            '{% load mapentity_tags %}'
            '{{ date|timesince }}'
        ).render(Context({
            'date': make_aware(datetime(2021, 12, 12, 23, 59))
        }))
        self.assertEqual(out, "1 minute ago")

    def test_few_seconds_ago(self):
        out = Template(
            '{% load mapentity_tags %}'
            '{{ date|timesince }}'
        ).render(Context({
            'date': make_aware(datetime(2021, 12, 12, 23, 59, 59))
        }))
        self.assertEqual(out, "just a few seconds ago")


class MediaStaticFallbackPathTest(TestCase):
    def test_media_static_fallback_path(self):
        d = TemporaryDirectory()
        with override_settings(STATIC_ROOT=d.name):
            out = Template(
                '{% load mapentity_tags %}'
                '{% media_static_fallback_path "doesnotexist.png" "foo.png" %}'
            ).render(Context({}))

        self.assertEqual(os.path.join(d.name, 'foo.png'), out)

    def test_media_static_find_path(self):
        d = TemporaryDirectory()
        with override_settings(MEDIA_ROOT=d.name):
            with open(os.path.join(settings.MEDIA_ROOT, 'exist.png'), mode='wb') as f:
                f.write(b'iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/'
                        b'w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==')
            out = Template(
                '{% load mapentity_tags %}'
                '{% media_static_fallback_path "exist.png" "foo.png" %}'
            ).render(Context({}))
            self.assertEqual(out, f.name)


class MediaStaticFallbackTest(TestCase):
    def test_media_static_fallback(self):
        out = Template(
            '{% load mapentity_tags %}'
            '{% media_static_fallback "doesnotexist.png" "foo.png" %}'
        ).render(Context({}))

        self.assertEqual(out, "/static/foo.png")

    def test_media_static_find(self):
        d = TemporaryDirectory()
        with override_settings(MEDIA_ROOT=d.name):
            with open(os.path.join(settings.MEDIA_ROOT, 'exist.png'), mode='wb') as f:
                f.write(b'iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/'
                        b'w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==')
                out = Template(
                    '{% load mapentity_tags %}'
                    '{% media_static_fallback "exist.png" "foo.png" %}'
                ).render(Context({}))
                self.assertEqual(out, '/media/exist.png')


class SmartIncludeTest(TestCase):
    def test_smart_include_no_argument(self):
        with self.assertRaisesRegex(TemplateSyntaxError, "'smart_include' tag requires one argument"):
            Template(
                '{% load mapentity_tags %}'
                '{% smart_include %}'
            ).render(Context())

    def test_smart_include_no_quotes(self):
        with self.assertRaisesRegex(TemplateSyntaxError,
                                    "'smart_include' tag's viewname argument should be in quotes"):
            Template(
                '{% load mapentity_tags %}'
                '{% smart_include test %}'
            ).render(Context())


class LatLngBoundsTest(TestCase):
    def test_latlngbound_null(self):
        out = Template(
            '{% load mapentity_tags %}'
            '{{ object|latlngbounds }}'
        ).render(Context({'object': None}))
        self.assertEqual('null', out)

    def test_latlngbound_object(self):
        object_dummy = DummyModelFactory.create(geom='SRID=2154;POINT(0 0)')
        out = Template(
            '{% load mapentity_tags %}'
            '{{ object|latlngbounds }}'
        ).render(Context({'object': object_dummy}))
        json_out = json.loads(out)
        self.assertAlmostEqual(json_out[0][0], -5.9838563092087576)
        self.assertAlmostEqual(json_out[0][1], -1.363081210117898)
        self.assertAlmostEqual(json_out[1][0], -5.9838563092087576)
        self.assertAlmostEqual(json_out[1][1], -1.363081210117898)

    def test_latlngbound_geosgeometry(self):
        object_dummy = DummyModelFactory.create(geom='SRID=2154;POINT(0 0)')
        geom = object_dummy.geom
        out = Template(
            '{% load mapentity_tags %}'
            '{{ geom|latlngbounds }}'
        ).render(Context({'geom': geom}))
        json_out = json.loads(out)
        # This time there is no transformation
        self.assertAlmostEqual(json_out[0][0], 0)
        self.assertAlmostEqual(json_out[0][1], 0)
        self.assertAlmostEqual(json_out[1][0], 0)
        self.assertAlmostEqual(json_out[1][1], 0)


class FieldVerboseNameTest(TestCase):
    def test_field_no_field_but_verbose_name_field(self):
        object_dummy = DummyModelFactory.create()
        setattr(object_dummy, 'do_not_exist_verbose_name', "test")
        template = Template(
            '{% load mapentity_tags %}'
            '{{ object|verbose:"do_not_exist" }}'
        ).render(Context({'object': object_dummy}))
        self.assertEqual(template, "test")

    def test_field_verbose_name_field_does_not_exist(self):
        object_dummy = DummyModelFactory.create()
        with self.assertRaisesRegex(FieldDoesNotExist, "DummyModel has no field named 'do_not_exist'"):
            Template(
                '{% load mapentity_tags %}'
                '{{ object|verbose:"do_not_exist" }}'
            ).render(Context({'object': object_dummy}))
