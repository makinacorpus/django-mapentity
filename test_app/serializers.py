from rest_framework import serializers
from rest_framework_gis import fields as rest_gis_fields
from rest_framework_gis.serializers import GeoFeatureModelSerializer

from mapentity.serializers import MapentityModelSerializer
from test_app.models import DummyModel


class DummySerializer(MapentityModelSerializer):
    class Meta:
        fields = "__all__"
        model = DummyModel


class DummyGeojsonSerializer(GeoFeatureModelSerializer, DummySerializer):
    api_geom = rest_gis_fields.GeometryField(read_only=True, precision=5)

    class Meta(DummySerializer.Meta):
        fields = ('id',)
        geo_field = "api_geom"
