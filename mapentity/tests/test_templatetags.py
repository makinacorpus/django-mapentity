from django.test import TestCase
from django.template import Template, Context

from .models import DummyModel


class ValueListTest(TestCase):
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
        obj = DummyModel(name='blah')
        out = Template(
            '{% load mapentity_tags %}'
            '{% valuelist items field="name" %}'
        ).render(Context({
            'items': [obj]
        }))
        self.assertEqual(out.strip(), """<ul>\n    <li>blah</li>\n    </ul>""")

    def test_can_specify_an_enumeration(self):
        out = Template(
            '{% load mapentity_tags %}'
            '{% valuelist items enumeration=True %}'
        ).render(Context({
            'items': range(1, 30)
        }))
        self.assertIn('<li><span class="enumeration-value">A.&nbsp;</span>1</li>', out)
        self.assertIn('<li><span class="enumeration-value">Z.&nbsp;</span>26</li>', out)
        self.assertIn('<li><span class="enumeration-value">AA.&nbsp;</span>27</li>', out)
        self.assertIn('<li><span class="enumeration-value">AB.&nbsp;</span>28</li>', out)
