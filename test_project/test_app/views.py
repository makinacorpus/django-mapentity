from django.contrib.gis.db.models.functions import Transform
from django.db.models import F
from rest_framework.permissions import DjangoModelPermissionsOrAnonReadOnly

from mapentity import views as mapentity_views

from .filters import (
    CityFilterSet,
    DummyAptFilterSet,
    DummyModelFilterSet,
    GeoPointFilterSet,
    MushroomSpotFilterSet,
    RoadFilterSet,
    SupermarketFilterSet,
)
from .forms import (
    CityForm,
    DummyAptModelForm,
    DummyModelForm,
    MushroomSpotForm,
    RoadForm,
    SupermarketForm,
)
from .models import (
    City,
    DummyAptModel,
    DummyModel,
    GeoPoint,
    MushroomSpot,
    Road,
    Supermarket,
)
from .serializers import (
    CitySerializer,
    DummyAptGeojsonSerializer,
    DummyAptSerializer,
    DummyGeojsonSerializer,
    DummySerializer,
    GeoPointSerializer,
    MushroomSpotGeojsonSerializer,
    MushroomSpotSerializer,
    RoadSerializer,
    SupermarketGeojsonSerializer,
    SupermarketSerializer,
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


class DummyAptCreate(mapentity_views.MapEntityCreate):
    model = DummyAptModel  # Assuming DummyaptModel is similar to DummyModel
    form_class = DummyAptModelForm


class DummyAptUpdate(mapentity_views.MapEntityUpdate):
    model = DummyAptModel  # Assuming DummyaptModel is similar to DummyModel
    form_class = DummyAptModelForm


class DummyAptDelete(mapentity_views.MapEntityDelete):
    model = DummyAptModel  # Assuming DummyaptModel is similar to DummyModel


class DummyAptDuplicate(mapentity_views.MapEntityDuplicate):
    model = DummyAptModel  # Assuming DummyaptModel is similar to DummyModel


class DummyAptList(mapentity_views.MapEntityList):
    model = DummyAptModel  # Assuming DummyaptModel is similar to DummyModel
    columns = ["id", "name", "public", "date_update"]
    searchable_columns = ["name"]
    filterset_class = DummyAptFilterSet


class DummyAptDetail(
    mapentity_views.LastModifiedMixin, mapentity_views.MapEntityDetail
):
    model = DummyAptModel  # Assuming DummyaptModel is similar to DummyModel


class DummyAptFilter(mapentity_views.MapEntityFilter):
    model = DummyAptModel  # Assuming DummyaptModel is similar to DummyModel
    filterset_class = DummyAptFilterSet


class DummyAptViewSet(mapentity_views.MapEntityViewSet):
    model = DummyAptModel  # Assuming DummyaptModel is similar to DummyModel
    serializer_class = DummyAptSerializer
    geojson_serializer_class = DummyAptGeojsonSerializer
    permission_classes = [DjangoModelPermissionsOrAnonReadOnly]
    filterset_class = DummyAptFilterSet

    def get_queryset(self):
        qs = self.model.objects.all()
        if self.format_kwarg == "geojson":
            qs = qs.annotate(api_geom=Transform("geom", 4326))
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


class GeoPointlist(mapentity_views.MapEntityList):
    model = GeoPoint
    columns = ["id", "name", "public"]
    filterset_class = GeoPointFilterSet


class GeoPointMultiDelete(mapentity_views.MapEntityMultiDelete):
    model = GeoPoint


class GeoPointMultiUpdate(mapentity_views.MapEntityMultiUpdate):
    model = GeoPoint


class GeoPointViewSet(mapentity_views.MapEntityViewSet):
    model = GeoPoint
    serializer_class = GeoPointSerializer  # Assuming City has similar fields to Road for the serializer
    filterset_class = GeoPointFilterSet

    def get_queryset(self):
        qs = self.model.objects.all()
        if self.format_kwarg == "geojson":
            qs = qs.annotate(api_geom=Transform("geom", 4326))
        return qs


# Supermarket views
class SupermarketList(mapentity_views.MapEntityList):
    model = Supermarket
    searchable_columns = ["id", "name"]
    filterset_class = SupermarketFilterSet


class SupermarketDetail(
    mapentity_views.LastModifiedMixin, mapentity_views.MapEntityDetail
):
    model = Supermarket


class SupermarketCreate(mapentity_views.MapEntityCreate):
    model = Supermarket
    form_class = SupermarketForm


class SupermarketUpdate(mapentity_views.MapEntityUpdate):
    model = Supermarket
    form_class = SupermarketForm


class SupermarketDelete(mapentity_views.MapEntityDelete):
    model = Supermarket


class SupermarketViewSet(mapentity_views.MapEntityViewSet):
    model = Supermarket
    serializer_class = SupermarketSerializer
    geojson_serializer_class = SupermarketGeojsonSerializer
    permission_classes = [DjangoModelPermissionsOrAnonReadOnly]
    filterset_class = SupermarketFilterSet

    def get_queryset(self):
        qs = self.model.objects.all()
        if self.format_kwarg == "geojson":
            qs = qs.annotate(api_geom=Transform("geom", 4326))
        return qs


class SupermarketList(mapentity_views.MapEntityList):
    model = Supermarket
    columns = ["id", "geom", "parking"]


class SupermarketCreate(mapentity_views.MapEntityCreate):
    model = Supermarket
    form_class = SupermarketForm


class SupermarketUpdate(mapentity_views.MapEntityUpdate):
    model = Supermarket
    form_class = SupermarketForm


class SupermarketDelete(mapentity_views.MapEntityDelete):
    model = Supermarket


class SupermarketViewSet(mapentity_views.MapEntityViewSet):
    model = Supermarket
    serializer_class = SupermarketSerializer

    def get_queryset(self):
        qs = self.model.objects.all()
        if self.format_kwarg == "geojson":
            qs = qs.annotate(api_geom=Transform("geom", 4326))
        return qs
