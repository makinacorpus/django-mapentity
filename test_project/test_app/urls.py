from mapentity.registry import registry

from .models import (
    City,
    ComplexModel,
    DummyModel,
    MushroomSpot,
    Road,
    Supermarket,
)

app_name = "test_app"

urlpatterns = registry.register(DummyModel)
urlpatterns += registry.register(MushroomSpot)
urlpatterns += registry.register(Road)
urlpatterns += registry.register(City)
urlpatterns += registry.register(ComplexModel)
urlpatterns += registry.register(Supermarket)
