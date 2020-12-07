from django.test import TestCase

from mapentity.forms import MapEntityForm
from mapentity.tests.factories import DummyModelFactory
from test_app.models import DummyModel


class DummyForm(MapEntityForm):
    class Meta:
        model = DummyModel
        fields = '__all__'


class MapEntityFormTest(TestCase):

    def test_can_delete_actions(self):
        sample_object = DummyModelFactory.create()
        delete_url = sample_object.get_delete_url()
        form = DummyForm(instance=sample_object)
        self.assertTrue(form.can_delete)
        self.assertTrue(('<a class="btn btn-danger delete" href="%s">' % delete_url) in form.helper.layout[1][0].html)

        form = DummyForm(instance=sample_object, can_delete=False)
        self.assertFalse(form.can_delete)
        self.assertTrue('<a class="btn disabled delete" href="#">' in form.helper.layout[1][0].html)
