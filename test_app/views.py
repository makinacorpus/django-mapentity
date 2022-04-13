from rest_framework.permissions import DjangoModelPermissionsOrAnonReadOnly

from mapentity import views as mapentity_views
from .filters import DummyModelFilter
from .models import DummyModel, Road
from .serializers import DummySerializer, DummyGeojsonSerializer, RoadSerializer


class DummyList(mapentity_views.MapEntityList):
    model = DummyModel
    filterform = DummyModelFilter
    searchable_columns = ['id', 'name']


class DummyLayer(mapentity_views.MapEntityLayer):
    model = DummyModel


class DummyFormat(mapentity_views.MapEntityFormat):
    model = DummyModel


class DummyDocumentOdt(mapentity_views.MapEntityDocumentOdt):
    model = DummyModel


class DummyDocumentWeasyprint(mapentity_views.MapEntityDocumentWeasyprint):
    model = DummyModel


class DummyDetail(mapentity_views.LastModifiedMixin, mapentity_views.MapEntityDetail):
    model = DummyModel


class DummyCreate(mapentity_views.MapEntityCreate):
    model = DummyModel


class DummyUpdate(mapentity_views.MapEntityUpdate):
    model = DummyModel


class DummyDelete(mapentity_views.MapEntityDelete):
    model = DummyModel


class DummyViewSet(mapentity_views.MapEntityViewSet):
    model = DummyModel  # Must be defined to be detected by mapentity
    queryset = DummyModel.objects.all()
    serializer_class = DummySerializer
    geojson_serializer_class = DummyGeojsonSerializer
    permission_classes = [DjangoModelPermissionsOrAnonReadOnly]
    filterset_class = DummyModelFilter


class RoadViewSet(mapentity_views.MapEntityViewSet):
    model = Road  # Must be defined to be detected by mapentity
    queryset = Road.objects.all()
    serializer_class = RoadSerializer
    permission_classes = [DjangoModelPermissionsOrAnonReadOnly]
