from mapentity import views as mapentity_views

from .models import DummyModel


class DummyList(mapentity_views.MapEntityList):
    model = DummyModel
    template_name = 'mapentity/entity_list.html'


class DummyDetail(mapentity_views.MapEntityDetail):
    model = DummyModel
    template_name = 'mapentity/entity_detail.html'


class DummyCreate(mapentity_views.MapEntityCreate):
    model = DummyModel
    template_name = 'mapentity/entity_form.html'


class DummyUpdate(mapentity_views.MapEntityUpdate):
    model = DummyModel
    template_name = 'mapentity/entity_form.html'


class DummyDelete(mapentity_views.MapEntityDelete):
    model = DummyModel
