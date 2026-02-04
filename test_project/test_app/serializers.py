from rest_framework import serializers

from mapentity.serializers import MapentityGeojsonModelSerializer

from .models import (
    City,
    DummyAptModel,
    DummyModel,
    GeoPoint,
    MushroomSpot,
    Road,
    Supermarket,
)


class DummySerializer(serializers.ModelSerializer):
    class Meta:
        fields = "__all__"
        model = DummyModel


class DummyGeojsonSerializer(MapentityGeojsonModelSerializer):
    class Meta(MapentityGeojsonModelSerializer.Meta):
        fields = ["id", "name"]
        model = DummyModel


class RoadSerializer(serializers.ModelSerializer):
    class Meta:
        fields = "__all__"
        model = Road


class DummyAptSerializer(serializers.ModelSerializer):
    class Meta:
        fields = "__all__"
        model = DummyAptModel  # Assuming DummyaptModel is similar to DummyModel


class DummyAptGeojsonSerializer(MapentityGeojsonModelSerializer):
    class Meta(MapentityGeojsonModelSerializer.Meta):
        fields = ["id", "name"]
        model = DummyAptModel  # Assuming DummyaptModel is similar to DummyModel


class CitySerializer(serializers.ModelSerializer):
    class Meta:
        fields = "__all__"
        model = City


class GeoPointSerializer(serializers.ModelSerializer):
    class Meta:
        fields = "__all__"
        model = GeoPoint


class MushroomSpotSerializer(serializers.ModelSerializer):
    class Meta:
        fields = "__all__"
        model = MushroomSpot


class MushroomSpotGeojsonSerializer(MapentityGeojsonModelSerializer):
    class Meta(MapentityGeojsonModelSerializer.Meta):
        fields = ["id", "name"]
        model = MushroomSpot


class SupermarketSerializer(serializers.ModelSerializer):
    class Meta:
        fields = "__all__"
        model = Supermarket
