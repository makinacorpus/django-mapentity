from mapentity.registry import MapEntityOptions, registry

from .models import (
    City,
    ComplexModel,
    DummyModel,
    HiddenModel,
    MushroomSpot,
    Road,
)

app_name = "test_app"


class HiddenModelOptions(MapEntityOptions):
    menu = False


urlpatterns = registry.register(DummyModel)
urlpatterns += registry.register(MushroomSpot)
urlpatterns += registry.register(Road)
urlpatterns += registry.register(City)
urlpatterns += registry.register(ComplexModel)
urlpatterns += registry.register(HiddenModel, HiddenModelOptions)
