from rest_framework_gis.fields import GeometryField
from rest_framework_gis.serializers import GeoFeatureModelSerializer, GeoFeatureModelListSerializer

from ..settings import app_settings


class MapentityGeojsonModelListSerializer(GeoFeatureModelListSerializer):
    def to_representation(self, data):
        """
        Add GeoJSON compatible formatting to a serialized queryset list
        """
        app_label = self._kwargs['child'].Meta.model._meta.app_label
        model_name = self._kwargs['child'].Meta.model._meta.model_name
        repr = super().to_representation(data)
        repr['model'] = f"{app_label}.{model_name}"
        return repr


class MapentityGeojsonModelSerializer(GeoFeatureModelSerializer):
    api_geom = GeometryField(read_only=True, precision=app_settings.get('GEOJSON_PRECISION'))

    class Meta:
        list_serializer_class = MapentityGeojsonModelListSerializer
        geo_field = 'api_geom'
        fields = ['id', ]
