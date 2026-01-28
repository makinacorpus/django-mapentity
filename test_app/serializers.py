from rest_framework import serializers

from mapentity.serializers import MapentityGeojsonModelSerializer
from test_app.models import City, DummyAptModel, DummyModel, GeoPoint, Road, MushroomSpot


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


class DummyAptSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="name_display")

    class Meta:
        fields = "__all__"
        model = DummyAptModel  # Assuming DummyaptModel is similar to DummyModel


class DummyAptGeojsonSerializer(MapentityGeojsonModelSerializer):
    class Meta(MapentityGeojsonModelSerializer.Meta):
        fields = ["id", "name"]
        model = DummyAptModel  # Assuming DummyaptModel is similar to DummyModel


class CitySerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="name_display")

    class Meta:
        fields = "__all__"
        model = City


class GeoPointSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="name_display")

    class Meta:
        fields = "__all__"
        model = GeoPoint

class MushroomSpotSerializer(serializers.ModelSerializer):
    class Meta:
        fields = "__all__"
        model = MushroomSpot
