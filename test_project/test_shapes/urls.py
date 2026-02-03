from mapentity.registry import registry

from . import models

app_name = "test_shapes"

urlpatterns = registry.register(models.SinglePointModel)
urlpatterns += registry.register(models.SingleLineStringModel)
urlpatterns += registry.register(models.SinglePolygonModel)
urlpatterns += registry.register(models.GeometryModel)
urlpatterns += registry.register(models.MultiPointModel)
urlpatterns += registry.register(models.MultiLineStringModel)
urlpatterns += registry.register(models.MultiPolygonModel)
urlpatterns += registry.register(models.GeometryCollectionModel)
