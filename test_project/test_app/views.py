from django.contrib.gis.db.models.functions import Transform
from django.db.models import F
from rest_framework.permissions import DjangoModelPermissionsOrAnonReadOnly

from mapentity import views as mapentity_views

from .filters import (
    CityFilterSet,
    ComplexModelFilterSet,
    DummyModelFilterSet,
    MushroomSpotFilterSet,
    RoadFilterSet,
)
from .forms import (
    CityForm,
    DummyModelForm,
    MushroomSpotForm,
    RoadForm,
)
from .models import (
    City,
    ComplexModel,
    DummyModel,
    HiddenModel,
    MushroomSpot,
    Road,
)
from .serializers import (
    CitySerializer,
    ComplexModelSerializer,
    DummyGeojsonSerializer,
    DummySerializer,
    HiddenModelGeojsonSerializer,
    HiddenModelSerializer,
    MushroomSpotGeojsonSerializer,
    MushroomSpotSerializer,
    RoadSerializer,
)


class DummyList(mapentity_views.MapEntityList):
    model = DummyModel
    columns = ["id", "name", "public"]
    searchable_columns = ["id", "name"]
    filterset_class = DummyModelFilterSet


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


class RoadUpdate(mapentity_views.MapEntityUpdate):
    model = Road
    form_class = RoadForm


class RoadDelete(mapentity_views.MapEntityDelete):
    model = Road


class RoadViewSet(mapentity_views.MapEntityViewSet):
    model = Road  # Must be defined to be detected by mapentity
    queryset = Road.objects.all()
    serializer_class = RoadSerializer
    permission_classes = [DjangoModelPermissionsOrAnonReadOnly]
    filterset_class = RoadFilterSet


class RoadList(mapentity_views.MapEntityList):
    model = Road  # Must be defined to be detected by mapentity
    filterset_class = RoadFilterSet  # Test that we can also override base filter here


class RoadDetail(mapentity_views.LastModifiedMixin, mapentity_views.MapEntityDetail):
    model = Road  # Must be defined to be detected by mapentity


class RoadFilter(mapentity_views.MapEntityFilter):
    model = Road  # Must be defined to be detected by mapentity
    filterset_class = RoadFilterSet


class MushroomSpotList(mapentity_views.MapEntityList):
    model = MushroomSpot
    columns = ["id", "name", "number", "size", "boolean"]
    filterset_class = MushroomSpotFilterSet


class MushroomSpotCreate(mapentity_views.MapEntityCreate):
    model = MushroomSpot
    form_class = MushroomSpotForm


class MushroomSpotUpdate(mapentity_views.MapEntityUpdate):
    model = MushroomSpot
    form_class = MushroomSpotForm


class MushroomSpotViewSet(mapentity_views.MapEntityViewSet):
    model = MushroomSpot
    serializer_class = MushroomSpotSerializer  # Assuming City has similar fields to Road for the serializer
    geojson_serializer_class = MushroomSpotGeojsonSerializer
    filterset_class = MushroomSpotFilterSet

    def get_queryset(self):
        qs = self.model.objects.all()
        if self.format_kwarg == "geojson":
            qs = qs.annotate(api_geom=F("geom"))
        return qs


class CityList(mapentity_views.MapEntityList):
    model = City
    searchable_columns = ["id", "name"]
    filterset_class = CityFilterSet


class CityDetail(mapentity_views.LastModifiedMixin, mapentity_views.MapEntityDetail):
    model = City


class CityCreate(mapentity_views.MapEntityCreate):
    model = City
    form_class = CityForm  # Assuming City has similar fields to Road for the form


class CityUpdate(mapentity_views.MapEntityUpdate):
    model = City
    form_class = CityForm  # Assuming City has similar fields to Road for the form


class CityDelete(mapentity_views.MapEntityDelete):
    model = City


class CityViewSet(mapentity_views.MapEntityViewSet):
    model = City
    serializer_class = (
        CitySerializer  # Assuming City has similar fields to Road for the serializer
    )
    permission_classes = [DjangoModelPermissionsOrAnonReadOnly]
    filterset_class = CityFilterSet

    def get_queryset(self):
        qs = self.model.objects.all()
        if self.format_kwarg == "geojson":
            qs = qs.annotate(api_geom=Transform("geom", 4326))
        return qs


class ComplexModellist(mapentity_views.MapEntityList):
    model = ComplexModel
    columns = ["id", "name", "public"]
    filterset_class = ComplexModelFilterSet


class ComplexModelMultiDelete(mapentity_views.MapEntityMultiDelete):
    model = ComplexModel


class ComplexModelMultiUpdate(mapentity_views.MapEntityMultiUpdate):
    model = ComplexModel


class ComplexModelViewSet(mapentity_views.MapEntityViewSet):
    model = ComplexModel
    serializer_class = ComplexModelSerializer  # Assuming City has similar fields to Road for the serializer
    filterset_class = ComplexModelFilterSet

    def get_queryset(self):
        qs = self.model.objects.all()
        if self.format_kwarg == "geojson":
            qs = qs.annotate(api_geom=Transform("geom", 4326))
        return qs


# HiddenModel views (menu=False)
class HiddenModelViewSet(mapentity_views.MapEntityViewSet):
    model = HiddenModel
    serializer_class = HiddenModelSerializer
    geojson_serializer_class = HiddenModelGeojsonSerializer
    permission_classes = [DjangoModelPermissionsOrAnonReadOnly]

    def get_queryset(self):
        qs = self.model.objects.all()
        if self.format_kwarg == "geojson":
            qs = qs.annotate(api_geom=Transform("geom", 4326))
        return qs
