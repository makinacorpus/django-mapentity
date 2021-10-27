from test_app.models import DummyModel, MushroomSpot
from mapentity.registry import registry

app_name = 'test_app'

urlpatterns = registry.register(DummyModel)
urlpatterns += registry.register(MushroomSpot)
