from test_app.models import City, DummyModel, MushroomSpot, Road

from mapentity.registry import registry

app_name = 'test_app'

urlpatterns = registry.register(DummyModel)
urlpatterns += registry.register(MushroomSpot)
urlpatterns += registry.register(Road)
urlpatterns += registry.register(City)
