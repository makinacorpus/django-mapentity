from mapentity.registry import registry
from test_app.models import City, DummyAptModel, DummyModel, MushroomSpot, Road

app_name = "test_app"

urlpatterns = registry.register(DummyModel)
urlpatterns += registry.register(MushroomSpot)
urlpatterns += registry.register(Road)
urlpatterns += registry.register(City)
urlpatterns += registry.register(DummyAptModel)
