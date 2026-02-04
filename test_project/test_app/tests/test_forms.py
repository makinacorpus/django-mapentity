from django import forms
from django.test import TestCase
from django.test.utils import override_settings

from mapentity.forms import BaseMultiUpdateForm, MapEntityForm
from mapentity.settings import app_settings

from ..models import DummyModel, GeoPoint, ManikinModel, Supermarket


class DummyForm(MapEntityForm):
    class Meta:
        model = DummyModel
        fields = "__all__"


class MapEntityFormTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.sample_object = DummyModel.objects.create()

    def test_can_delete_actions(self):
        delete_url = self.sample_object.get_delete_url()
        form = DummyForm(instance=self.sample_object)
        self.assertTrue(form.can_delete)
        self.assertTrue(
            (f'<a class="btn btn-danger delete" href="{delete_url}">')
            in form.helper.layout[1][0].html
        )
        form = DummyForm(instance=self.sample_object, can_delete=False)
        self.assertFalse(form.can_delete)
        self.assertTrue(
            '<a class="btn disabled delete" href="#">' in form.helper.layout[1][0].html
        )

    def test_translated_fields_layout(self):
        # Test fields for sublanguages are correctly overridden in forms
        form = DummyForm(instance=self.sample_object)
        self.assertIn("name_zh_hant", form.fields)
        self.assertEqual("Name [zh-hant]", form.fields["name_zh_hant"].label)


class MapEntityRichTextFormTest(TestCase):
    old_setting = app_settings.copy()
    old_setting["MAX_CHARACTERS"] = 10
    new_setting = app_settings.copy()
    new_setting["MAX_CHARACTERS_BY_FIELD"] = {
        "test_app_dummymodel": [{"field": "short_description", "value": 5}]
    }

    @override_settings(MAPENTITY_CONFIG=new_setting)
    def test_max_characters_by_field(self):
        """Test if help text is set with MAX_CHARACTERS_BY_FIELD setting"""
        sample_object = DummyModel.objects.create()

        form = DummyForm(instance=sample_object)
        self.assertIn("", form.fields["description"].help_text)
        self.assertIn(
            "Short description, 5 characters maximum recommended",
            form.fields["short_description"].help_text,
        )

    @override_settings(MAPENTITY_CONFIG=old_setting)
    def test_max_characters_global(self):
        """Test if help text is set with MAX_CHARACTERS setting -> deprecated paramter"""
        sample_object = DummyModel.objects.create()

        form = DummyForm(instance=sample_object)
        for field_name in ["description", "short_description"]:
            self.assertIn(
                "10 characters maximum recommended", form.fields[field_name].help_text
            )


class GeoPointForm(BaseMultiUpdateForm):
    class Meta:
        model = GeoPoint
        fields = [
            "public_en",
            "public_fr",
            "public_zh_hant",
            "located_in",
            "dummy_model",
            "road",
        ]


class ManikinModelForm(BaseMultiUpdateForm):
    class Meta:
        model = ManikinModel
        fields = ["dummy"]


class MultiUpdateFilterTest(TestCase):
    def setUp(self):
        self.form = GeoPointForm()

    def test_translated_fields(self):
        fields = list(self.form.fields.keys())
        self.assertIn("public_en", fields)
        self.assertIn("public_fr", fields)
        self.assertIn("public_zh_hant", fields)
        self.assertNotIn("public", fields)

    def test_translated_fields_for_not_registered_model(self):
        form = ManikinModelForm()
        fields = list(form.fields.keys())
        self.assertEqual(["dummy"], fields)

    def test_boolean_fields(self):
        fields = self.form.fields
        for field in ["public_en", "public_fr", "public_zh_hant"]:
            self.assertTrue(isinstance(fields[field], forms.ChoiceField))
            self.assertEqual(
                fields[field].widget.choices,
                [("nothing", "Do nothing"), ("true", "Yes"), ("false", "No")],
            )

    def test_nullable_foreign_key_fields(self):
        fields = self.form.fields
        self.assertTrue(isinstance(fields["located_in"], forms.ChoiceField))
        self.assertIn(("nothing", "Do nothing"), fields["located_in"].widget.choices)
        self.assertIn(("", "Null value"), fields["located_in"].widget.choices)
        self.assertEqual(fields["located_in"].initial, "nothing")

    def test_nullable_but_not_blank_foreign_key_fields(self):
        form = ManikinModelForm()
        fields = form.fields
        self.assertTrue(isinstance(fields["dummy"], forms.ChoiceField))
        self.assertIn(("nothing", "Do nothing"), fields["dummy"].widget.choices)
        self.assertNotIn(("", "Null value"), fields["dummy"].widget.choices)
        self.assertEqual(fields["dummy"].initial, "nothing")

    def test_not_nullable_foreign_key_fields(self):
        fields = self.form.fields
        self.assertTrue(isinstance(fields["road"], forms.ChoiceField))
        self.assertIn(("nothing", "Do nothing"), fields["road"].widget.choices)
        self.assertNotIn(("", "Null"), fields["road"].widget.choices)
        self.assertEqual(fields["road"].initial, "nothing")

    def test_crispy_form(self):
        helper = self.form.helper
        self.assertEqual(helper.form_id, "multi-update-form")
        self.assertEqual(helper.form_method, "post")
        self.assertEqual(helper.inputs[0].name, "cancel")
        self.assertEqual(helper.inputs[1].name, "save")


class SupermarketFormTest(TestCase):
    """Test multi-geometry field support with Supermarket model"""
    
    def test_multiple_geometry_fields(self):
        """Test that SupermarketForm correctly handles multiple geometry fields"""
        from ..forms import SupermarketForm
        from mapentity.widgets import MapWidget
        
        form = SupermarketForm()
        
        # Both geometry fields should be present
        self.assertIn('geom', form.fields)
        self.assertIn('parking', form.fields)
        
        # Both should have MapWidget
        self.assertIsInstance(form.fields['geom'].widget, MapWidget)
        self.assertIsInstance(form.fields['parking'].widget, MapWidget)
        
        # Check geomfields configuration
        self.assertEqual(form.geomfields, ['geom', 'parking'])
    
    def test_target_map_configuration(self):
        """Test that secondary geometry field targets the first field's map"""
        from ..forms import SupermarketForm
        
        form = SupermarketForm()
        
        # First geometry field should NOT have target_map
        geom_widget = form.fields['geom'].widget
        self.assertNotIn('target_map', geom_widget.attrs)
        
        # Second geometry field SHOULD have target_map pointing to first field
        parking_widget = form.fields['parking'].widget
        self.assertEqual(parking_widget.attrs.get('target_map'), 'geom')
    
    def test_form_layout(self):
        """Test that form layout includes both geometry fields"""
        from ..forms import SupermarketForm
        
        form = SupermarketForm()
        
        # Check that both geom fields are in the layout
        layout_fields = []
        for item in form.helper.layout:
            if hasattr(item, 'fields'):
                for field in item.fields:
                    if hasattr(field, 'fields'):
                        layout_fields.extend(field.fields)
        
        # Both geometry fields should be in the right panel
        self.assertIn('geom', layout_fields)
        self.assertIn('parking', layout_fields)
