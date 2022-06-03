from django.contrib.gis.db.models.functions import Transform
from rest_framework.permissions import DjangoModelPermissionsOrAnonReadOnly

from mapentity import views as mapentity_views
from .filters import DummyModelFilter
from .models import DummyModel, Road
from .serializers import DummySerializer, RoadSerializer, DummyGeojsonSerializer


class DummyList(mapentity_views.MapEntityList):
    model = DummyModel
    filterform = DummyModelFilter
    searchable_columns = ['id', 'name']


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
    model = DummyModel
    serializer_class = DummySerializer
    geojson_serializer_class = DummyGeojsonSerializer
    permission_classes = [DjangoModelPermissionsOrAnonReadOnly]
    filterset_class = DummyModelFilter

    def get_queryset(self):
        qs = self.model.objects.all()
        if self.format_kwarg == "geojson":
            qs = qs.annotate(api_geom=Transform("geom", 4326))
        return qs


class RoadViewSet(mapentity_views.MapEntityViewSet):
    model = Road  # Must be defined to be detected by mapentity
    queryset = Road.objects.all()
    serializer_class = RoadSerializer
    permission_classes = [DjangoModelPermissionsOrAnonReadOnly]
