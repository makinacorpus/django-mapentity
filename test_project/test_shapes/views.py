from mapentity import views as mapentity_views

from . import filters, models, serializers


# single point model
class SinglePointModelList(mapentity_views.MapEntityList):
    model = models.SinglePointModel
    searchable_columns = ["id", "name"]
    filterset_class = filters.SinglePointModelFilterSet


class SinglePointModelDetail(
    mapentity_views.LastModifiedMixin, mapentity_views.MapEntityDetail
):
    model = models.SinglePointModel


class SinglePointModelCreate(mapentity_views.MapEntityCreate):
    model = models.SinglePointModel


class SinglePointModelUpdate(mapentity_views.MapEntityUpdate):
    model = models.SinglePointModel


class SinglePointModelDelete(mapentity_views.MapEntityDelete):
    model = models.SinglePointModel


class SinglePointModelViewSet(mapentity_views.MapEntityViewSet):
    model = models.SinglePointModel
    serializer_class = serializers.SinglePointModelSerializer
    geojson_serializer_class = serializers.SinglePointModelGeojsonSerializer
    filterset_class = filters.SinglePointModelFilterSet


# single linestring model


class SingleLineStringModelList(mapentity_views.MapEntityList):
    model = models.SingleLineStringModel
    searchable_columns = ["id", "name"]
    filterset_class = filters.SingleLineStringModelFilterSet


class SingleLineStringModelDetail(
    mapentity_views.LastModifiedMixin, mapentity_views.MapEntityDetail
):
    model = models.SingleLineStringModel


class SingleLineStringModelCreate(mapentity_views.MapEntityCreate):
    model = models.SingleLineStringModel


class SingleLineStringModelUpdate(mapentity_views.MapEntityUpdate):
    model = models.SingleLineStringModel


class SingleLineStringModelDelete(mapentity_views.MapEntityDelete):
    model = models.SingleLineStringModel


class SingleLineStringModelViewSet(mapentity_views.MapEntityViewSet):
    model = models.SingleLineStringModel
    serializer_class = serializers.SingleLineStringModelSerializer
    geojson_serializer_class = serializers.SingleLineStringModelGeojsonSerializer
    filterset_class = filters.SingleLineStringModelFilterSet


# single polygon model
class SinglePolygonModelList(mapentity_views.MapEntityList):
    model = models.SinglePolygonModel
    searchable_columns = ["id", "name"]
    filterset_class = filters.SinglePolygonModelFilterSet


class SinglePolygonModelDetail(
    mapentity_views.LastModifiedMixin, mapentity_views.MapEntityDetail
):
    model = models.SinglePolygonModel


class SinglePolygonModelCreate(mapentity_views.MapEntityCreate):
    model = models.SinglePolygonModel


class SinglePolygonModelUpdate(mapentity_views.MapEntityUpdate):
    model = models.SinglePolygonModel


class SinglePolygonModelDelete(mapentity_views.MapEntityDelete):
    model = models.SinglePolygonModel


class SinglePolygonModelViewSet(mapentity_views.MapEntityViewSet):
    model = models.SinglePolygonModel
    serializer_class = serializers.SinglePolygonModelSerializer
    geojson_serializer_class = serializers.SinglePolygonModelGeojsonSerializer
    filterset_class = filters.SinglePolygonModelFilterSet


# geometry model
class GeometryModelList(mapentity_views.MapEntityList):
    model = models.GeometryModel
    searchable_columns = ["id", "name"]
    filterset_class = filters.GeometryModelFilterSet


class GeometryModelDetail(
    mapentity_views.LastModifiedMixin, mapentity_views.MapEntityDetail
):
    model = models.GeometryModel


class GeometryModelCreate(mapentity_views.MapEntityCreate):
    model = models.GeometryModel


class GeometryModelUpdate(mapentity_views.MapEntityUpdate):
    model = models.GeometryModel


class GeometryModelDelete(mapentity_views.MapEntityDelete):
    model = models.GeometryModel


class GeometryModelViewSet(mapentity_views.MapEntityViewSet):
    model = models.GeometryModel
    serializer_class = serializers.GeometryModelSerializer
    geojson_serializer_class = serializers.GeometryModelGeojsonSerializer
    filterset_class = filters.GeometryModelFilterSet


# multi point model
class MultiPointModelList(mapentity_views.MapEntityList):
    model = models.MultiPointModel
    searchable_columns = ["id", "name"]
    filterset_class = filters.MultiPointModelFilterSet


class MultiPointModelDetail(
    mapentity_views.LastModifiedMixin, mapentity_views.MapEntityDetail
):
    model = models.MultiPointModel


class MultiPointModelCreate(mapentity_views.MapEntityCreate):
    model = models.MultiPointModel


class MultiPointModelUpdate(mapentity_views.MapEntityUpdate):
    model = models.MultiPointModel


class MultiPointModelDelete(mapentity_views.MapEntityDelete):
    model = models.MultiPointModel


class MultiPointModelViewSet(mapentity_views.MapEntityViewSet):
    model = models.MultiPointModel
    serializer_class = serializers.MultiPointModelSerializer
    geojson_serializer_class = serializers.MultiPointModelGeojsonSerializer
    filterset_class = filters.MultiPointModelFilterSet


# multi linestring model
class MultiLineStringModelList(mapentity_views.MapEntityList):
    model = models.MultiLineStringModel
    searchable_columns = ["id", "name"]
    filterset_class = filters.MultiLineStringModelFilterSet


class MultiLineStringModelDetail(
    mapentity_views.LastModifiedMixin, mapentity_views.MapEntityDetail
):
    model = models.MultiLineStringModel


class MultiLineStringModelCreate(mapentity_views.MapEntityCreate):
    model = models.MultiLineStringModel


class MultiLineStringModelUpdate(mapentity_views.MapEntityUpdate):
    model = models.MultiLineStringModel


class MultiLineStringModelDelete(mapentity_views.MapEntityDelete):
    model = models.MultiLineStringModel


class MultiLineStringModelViewSet(mapentity_views.MapEntityViewSet):
    model = models.MultiLineStringModel
    serializer_class = serializers.MultiLineStringModelSerializer
    geojson_serializer_class = serializers.MultiLineStringModelGeojsonSerializer
    filterset_class = filters.MultiLineStringModelFilterSet


# multi polygon model
class MultiPolygonModelList(mapentity_views.MapEntityList):
    model = models.MultiPolygonModel
    searchable_columns = ["id", "name"]
    filterset_class = filters.MultiPolygonModelFilterSet


class MultiPolygonModelDetail(
    mapentity_views.LastModifiedMixin, mapentity_views.MapEntityDetail
):
    model = models.MultiPolygonModel


class MultiPolygonModelCreate(mapentity_views.MapEntityCreate):
    model = models.MultiPolygonModel


class MultiPolygonModelUpdate(mapentity_views.MapEntityUpdate):
    model = models.MultiPolygonModel


class MultiPolygonModelDelete(mapentity_views.MapEntityDelete):
    model = models.MultiPolygonModel


class MultiPolygonModelViewSet(mapentity_views.MapEntityViewSet):
    model = models.MultiPolygonModel
    serializer_class = serializers.MultiPolygonModelSerializer
    geojson_serializer_class = serializers.MultiPolygonModelGeojsonSerializer
    filterset_class = filters.MultiPolygonModelFilterSet


# geometry collection model
class GeometryCollectionModelList(mapentity_views.MapEntityList):
    model = models.GeometryCollectionModel
    searchable_columns = ["id", "name"]
    filterset_class = filters.GeometryCollectionModelFilterSet


class GeometryCollectionModelDetail(
    mapentity_views.LastModifiedMixin, mapentity_views.MapEntityDetail
):
    model = models.GeometryCollectionModel


class GeometryCollectionModelCreate(mapentity_views.MapEntityCreate):
    model = models.GeometryCollectionModel


class GeometryCollectionModelUpdate(mapentity_views.MapEntityUpdate):
    model = models.GeometryCollectionModel


class GeometryCollectionModelDelete(mapentity_views.MapEntityDelete):
    model = models.GeometryCollectionModel


class GeometryCollectionModelViewSet(mapentity_views.MapEntityViewSet):
    model = models.GeometryCollectionModel
    serializer_class = serializers.GeometryCollectionModelSerializer
    geojson_serializer_class = serializers.GeometryCollectionModelGeojsonSerializer
    filterset_class = filters.GeometryCollectionModelFilterSet
