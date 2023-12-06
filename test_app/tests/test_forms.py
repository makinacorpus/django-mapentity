from django.test import TestCase
from django.test.utils import override_settings

from mapentity.forms import MapEntityForm
from ..models import DummyModel
from mapentity.settings import app_settings


class DummyForm(MapEntityForm):
    class Meta:
        model = DummyModel
        fields = '__all__'


class MapEntityFormTest(TestCase):

    @classmethod
    def setUpTestData(cls):
        cls.sample_object = DummyModel.objects.create()

    def test_can_delete_actions(self):
        delete_url = self.sample_object.get_delete_url()
        form = DummyForm(instance=self.sample_object)
        self.assertTrue(form.can_delete)
        self.assertTrue(('<a class="btn btn-danger delete" href="%s">' % delete_url) in form.helper.layout[1][0].html)

        form = DummyForm(instance=self.sample_object, can_delete=False)
        self.assertFalse(form.can_delete)
        self.assertTrue('<a class="btn disabled delete" href="#">' in form.helper.layout[1][0].html)

    def test_translated_fields_layout(self):
        # Test fields for sublanguages are correctly overridden in forms
        form = DummyForm(instance=self.sample_object)
        self.assertIn('name_zh_hant', form.fields)
        self.assertEquals('Name [zh-hant]', form.fields['name_zh_hant'].label)


class MapEntityRichTextFormTest(TestCase):

    def setUp(self):
        app_settings['MAX_CHARACTERS'] = {
            "test_app_dummymodel": [{'field': 'short_description', 'value': 5}]
        }

    @override_settings(MAPENTITY_CONFIG=app_settings)
    def test_max_characters(self):
        """Test if help text is set with MAX_CHARACTERS setting"""
        sample_object = DummyModel.objects.create()

        form = DummyForm(instance=sample_object)
        self.assertIn('', form.fields['description'].help_text)
        self.assertIn('Short description, 5 characters maximum recommended',
                      form.fields['short_description'].help_text)

    def tearDown(self):
        app_settings['MAX_CHARACTERS'] = 1200

