from test_app.models import DummyModel, ComplexModel, MushroomSpot
from mapentity.registry import registry

app_name = 'test_app'
urlpatterns = registry.register(DummyModel) \
    + registry.register(ComplexModel) \
    + registry.register(MushroomSpot)
