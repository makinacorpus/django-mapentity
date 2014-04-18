from mapentity import views as mapentity_views
from mapentity import forms as mapentity_forms

from .models import DummyModel


class DummyForm(mapentity_forms.MapEntityForm):
    class Meta(mapentity_forms.MapEntityForm.Meta):
        model = DummyModel
        fields = mapentity_forms.MapEntityForm.Meta.fields + ['geom']


class DummyList(mapentity_views.MapEntityList):
    model = DummyModel


class DummyLayer(mapentity_views.MapEntityLayer):
    model = DummyModel


class DummyJsonList(mapentity_views.MapEntityJsonList, DummyList):
    pass


class DummyFormat(mapentity_views.MapEntityFormat):
    model = DummyModel


class DummyDocument(mapentity_views.MapEntityDocument):
    model = DummyModel


class DummyDetail(mapentity_views.MapEntityDetail):
    model = DummyModel


class DummyCreate(mapentity_views.MapEntityCreate):
    model = DummyModel
    form_class = DummyForm


class DummyUpdate(mapentity_views.MapEntityUpdate):
    model = DummyModel
    form_class = DummyForm


class DummyDelete(mapentity_views.MapEntityDelete):
    model = DummyModel
