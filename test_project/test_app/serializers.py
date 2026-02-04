from rest_framework import serializers

from mapentity.serializers import MapentityGeojsonModelSerializer

from .models import (
    City,
    ComplexModel,
    DummyModel,
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


class CitySerializer(serializers.ModelSerializer):
    class Meta:
        fields = "__all__"
        model = City


class ComplexModelSerializer(serializers.ModelSerializer):
    class Meta:
        fields = "__all__"
        model = ComplexModel


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


class SupermarketGeojsonSerializer(MapentityGeojsonModelSerializer):
    class Meta(MapentityGeojsonModelSerializer.Meta):
        fields = ["id", "name"]
        model = Supermarket
