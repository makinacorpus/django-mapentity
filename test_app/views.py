from django.contrib.gis.db.models.functions import Transform
from rest_framework.permissions import DjangoModelPermissionsOrAnonReadOnly

from mapentity import views as mapentity_views
from mapentity.views import MapEntityViewSet

from .models import DummyModel
from .serializers import DummySerializer, DummyGeojsonSerializer


class DummyList(mapentity_views.MapEntityList):
    model = DummyModel


class DummyLayer(mapentity_views.MapEntityLayer):
    model = DummyModel


class DummyJsonList(mapentity_views.MapEntityJsonList, DummyList):
    pass


class DummyFormat(mapentity_views.MapEntityFormat):
    model = DummyModel


class DummyDocumentOdt(mapentity_views.MapEntityDocumentOdt):
    model = DummyModel


class DummyDocumentWeasyprint(mapentity_views.MapEntityDocumentWeasyprint):
    model = DummyModel


class DummyDetail(mapentity_views.MapEntityDetail):
    model = DummyModel


class DummyCreate(mapentity_views.MapEntityCreate):
    model = DummyModel


class DummyUpdate(mapentity_views.MapEntityUpdate):
    model = DummyModel


class DummyDelete(mapentity_views.MapEntityDelete):
    model = DummyModel


class DummyViewSet(MapEntityViewSet):
    model = DummyModel
    serializer_class = DummySerializer
    geojson_serializer_class = DummyGeojsonSerializer
    permission_classes = [DjangoModelPermissionsOrAnonReadOnly]

    def get_queryset(self):
        return self.model.objects.all().annotate(api_geom=Transform('geom', 4326))
