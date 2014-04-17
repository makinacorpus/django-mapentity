from mapentity import views as mapentity_views

from .models import DummyModel

class DummyList(mapentity_views.MapEntityList):
    model = DummyModel
