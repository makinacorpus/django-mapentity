from django.contrib.gis.db.models.functions import Transform
from rest_framework.permissions import DjangoModelPermissionsOrAnonReadOnly

from mapentity import views as mapentity_views

from .filters import DummyModelFilterSet, RoadFilterSet
from .forms import DummyModelForm, MushroomSpotForm, RoadForm
from .models import DummyModel, MushroomSpot, Road
from .serializers import DummyGeojsonSerializer, DummySerializer, RoadSerializer


class DummyList(mapentity_views.MapEntityList):
    model = DummyModel
    searchable_columns = ["id", "name"]


class DummyFormat(mapentity_views.MapEntityFormat):
    model = DummyModel
    filterset_class = DummyModelFilterSet


class DummyDocumentOdt(mapentity_views.MapEntityDocumentOdt):
    model = DummyModel


class DummyDocumentWeasyprint(mapentity_views.MapEntityDocumentWeasyprint):
    model = DummyModel


class DummyDetail(mapentity_views.LastModifiedMixin, mapentity_views.MapEntityDetail):
    model = DummyModel


class DummyCreate(mapentity_views.MapEntityCreate):
    model = DummyModel
    form_class = DummyModelForm


class DummyUpdate(mapentity_views.MapEntityUpdate):
    model = DummyModel
    form_class = DummyModelForm


class DummyDelete(mapentity_views.MapEntityDelete):
    model = DummyModel


class DummyDuplicate(mapentity_views.MapEntityDuplicate):
    model = DummyModel


class DummyViewSet(mapentity_views.MapEntityViewSet):
    model = DummyModel
    serializer_class = DummySerializer
    geojson_serializer_class = DummyGeojsonSerializer
    permission_classes = [DjangoModelPermissionsOrAnonReadOnly]
    filterset_class = DummyModelFilterSet

    def get_queryset(self):
        qs = self.model.objects.all()
        if self.format_kwarg == "geojson":
            qs = qs.annotate(api_geom=Transform("geom", 4326))
        return qs


class DummyModelFilter(mapentity_views.MapEntityFilter):
    model = DummyModel
    filterset_class = DummyModelFilterSet


class RoadCreate(mapentity_views.MapEntityCreate):
    model = Road
    form_class = RoadForm


class RoadViewSet(mapentity_views.MapEntityViewSet):
    model = Road  # Must be defined to be detected by mapentity
    queryset = Road.objects.all()
    serializer_class = RoadSerializer
    permission_classes = [DjangoModelPermissionsOrAnonReadOnly]


class RoadList(mapentity_views.MapEntityList):
    model = Road  # Must be defined to be detected by mapentity
    filterset_class = RoadFilterSet  # Test that we can also override base filter here


class MushroomSpotCreate(mapentity_views.MapEntityCreate):
    model = MushroomSpot
    form_class = MushroomSpotForm


class MushroomSpotUpdate(mapentity_views.MapEntityUpdate):
    model = MushroomSpot
    form_class = MushroomSpotForm
