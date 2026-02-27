from django.contrib.gis.db.models.functions import Transform
from django.db.models import F, Q
from rest_framework.decorators import action
from rest_framework.permissions import DjangoModelPermissionsOrAnonReadOnly
from rest_framework.renderers import JSONRenderer
from rest_framework.response import Response

from mapentity import views as mapentity_views

from .filters import (
    CityFilterSet,
    ComplexModelFilterSet,
    DummyModelFilterSet,
    MultiGeomModelFilterSet,
    MushroomSpotFilterSet,
    RoadFilterSet,
)
from .forms import (
    CityForm,
    DummyModelForm,
    MultiGeomForm,
    MushroomSpotForm,
    RoadForm,
)
from .layers import DummyLayer
from .models import (
    City,
    ComplexModel,
    DummyModel,
    HiddenModel,
    MultiGeomModel,
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
    MultiGeomModelGeojsonSerializer,
    MultiGeomModelSerializer,
    MushroomSpotGeojsonSerializer,
    MushroomSpotSerializer,
    RoadAutoCompleteSerializer,
    RoadSerializer,
)


class AutocompleteMixin:
    autocomplete_search_fields = None
    serializer_autocomplete_class = None

    def _get_filters(self, q):
        filters = Q()
        for field in self.autocomplete_search_fields:
            filters |= Q(**{f"{field}__icontains": q})
        return filters

    @action(detail=False, renderer_classes=[JSONRenderer], pagination_class=None)
    def autocomplete(self, request, *args, **kwargs):
        qs = self.get_queryset_autocomplete()
        identifier = self.request.query_params.get(
            "id"
        )  # filter with id parameter is used to retrieve a known value
        if identifier:
            qs = qs.filter(id=identifier)
            instance = qs.first()
            if instance is None:
                return Response({})
            serializer = self.serializer_autocomplete_class(instance)
            data = serializer.data
        else:
            q = self.request.query_params.get(
                "q"
            )  # filter with q parameter is standard for select2 (dal)
            qs = qs.filter(self._get_filters(q)) if q else qs
            serializer = self.serializer_autocomplete_class(qs[:10], many=True)
            data = {"results": serializer.data}
        return Response(data)


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

    def get_layer_classes(self):
        return [DummyLayer]

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


class RoadViewSet(AutocompleteMixin, mapentity_views.MapEntityViewSet):
    model = Road  # Must be defined to be detected by mapentity
    queryset = Road.objects.all()
    serializer_class = RoadSerializer
    permission_classes = [DjangoModelPermissionsOrAnonReadOnly]
    serializer_autocomplete_class = RoadAutoCompleteSerializer
    filterset_class = RoadFilterSet
    autocomplete_search_fields = ["name"]

    def get_queryset_autocomplete(self):
        return Road.objects.all()


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


class MushroomSpotFilter(mapentity_views.MapEntityFilter):
    model = MushroomSpot
    filterset_class = MushroomSpotFilterSet


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


class CityFilter(mapentity_views.MapEntityFilter):
    model = City
    filterset_class = CityFilterSet


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


class ComplexModelFilter(mapentity_views.MapEntityFilter):
    model = ComplexModel
    filterset_class = ComplexModelFilterSet


class MultiGeomList(mapentity_views.MapEntityList):
    model = MultiGeomModel
    columns = ["id", "name"]
    searchable_columns = ["id", "name"]
    filterset_class = MultiGeomModelFilterSet


class MultiGeomFormat(mapentity_views.MapEntityFormat):
    model = MultiGeomModel
    filterset_class = MultiGeomModelFilterSet


class MultiGeomDocumentOdt(mapentity_views.MapEntityDocumentOdt):
    model = MultiGeomModel


class MultiGeomDocumentWeasyprint(mapentity_views.MapEntityDocumentWeasyprint):
    model = MultiGeomModel


class MultiGeomDetail(
    mapentity_views.LastModifiedMixin, mapentity_views.MapEntityDetail
):
    model = MultiGeomModel


class MultiGeomCreate(mapentity_views.MapEntityCreate):
    model = MultiGeomModel
    form_class = MultiGeomForm


class MultiGeomUpdate(mapentity_views.MapEntityUpdate):
    model = MultiGeomModel
    form_class = MultiGeomForm


class MultiGeomDelete(mapentity_views.MapEntityDelete):
    model = MultiGeomModel


class MultiGeomDuplicate(mapentity_views.MapEntityDuplicate):
    model = MultiGeomModel


class MultiGeomViewSet(mapentity_views.MapEntityViewSet):
    model = MultiGeomModel
    serializer_class = MultiGeomModelSerializer
    geojson_serializer_class = MultiGeomModelGeojsonSerializer
    permission_classes = [DjangoModelPermissionsOrAnonReadOnly]
    filterset_class = MultiGeomModelFilterSet

    def get_queryset(self):
        qs = self.model.objects.all()
        if self.format_kwarg == "geojson":
            qs = qs.annotate(api_geom=Transform("geom", 4326))
        return qs


class MultiGeomFilter(mapentity_views.MapEntityFilter):
    model = MultiGeomModel
    filterset_class = MultiGeomModelFilterSet


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
