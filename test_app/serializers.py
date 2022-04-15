from rest_framework import serializers
from rest_framework_gis import fields as rest_gis_fields

from test_app.models import DummyModel, Road
from mapentity.serializers import MapentityGeojsonModelSerializer


class DummySerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='name_display')

    class Meta:
        fields = "__all__"
        model = DummyModel


class DummyGeojsonSerializer(MapentityGeojsonModelSerializer):
    api_geom = rest_gis_fields.GeometryField(read_only=True, precision=5)

    class Meta(MapentityGeojsonModelSerializer.Meta):
        model = DummyModel
        fields = ('id', 'name')
        geo_field = "api_geom"


class RoadSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='name_display')

    class Meta:
        fields = "__all__"
        model = Road
