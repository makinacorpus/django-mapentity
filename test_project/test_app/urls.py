from mapentity.registry import registry
from test_project.test_app.models import City, DummyModel, MushroomSpot, Road

app_name = "test_app"

urlpatterns = registry.register(DummyModel)
urlpatterns += registry.register(MushroomSpot)
urlpatterns += registry.register(Road)
urlpatterns += registry.register(City)
