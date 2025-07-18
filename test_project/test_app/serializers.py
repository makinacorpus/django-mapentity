from rest_framework import serializers

from mapentity.serializers import MapentityGeojsonModelSerializer
from test_project.test_app.models import DummyModel, Road


class DummySerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="name_display")

    class Meta:
        fields = "__all__"
        model = DummyModel


class DummyGeojsonSerializer(MapentityGeojsonModelSerializer):
    class Meta(MapentityGeojsonModelSerializer.Meta):
        fields = ["id", "name"]
        model = DummyModel


class RoadSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="name_display")

    class Meta:
        fields = "__all__"
        model = Road
