from rest_framework import serializers

from mapentity.serializers import MapentityGeojsonModelSerializer

from . import models


class SinglePointModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.SinglePointModel
        fields = "__all__"


class SinglePointModelGeojsonSerializer(MapentityGeojsonModelSerializer):
    class Meta(MapentityGeojsonModelSerializer.Meta):
        model = models.SinglePointModel
        fields = "__all__"


class SingleLineStringModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.SingleLineStringModel
        fields = "__all__"


class SingleLineStringModelGeojsonSerializer(MapentityGeojsonModelSerializer):
    class Meta(MapentityGeojsonModelSerializer.Meta):
        model = models.SingleLineStringModel
        fields = "__all__"


class SinglePolygonModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.SinglePolygonModel
        fields = "__all__"


class SinglePolygonModelGeojsonSerializer(MapentityGeojsonModelSerializer):
    class Meta(MapentityGeojsonModelSerializer.Meta):
        model = models.SinglePolygonModel
        fields = "__all__"


class GeometryModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.GeometryModel
        fields = "__all__"


class GeometryModelGeojsonSerializer(MapentityGeojsonModelSerializer):
    class Meta(MapentityGeojsonModelSerializer.Meta):
        model = models.GeometryModel
        fields = "__all__"


class MultiPointModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.MultiPointModel
        fields = "__all__"


class MultiPointModelGeojsonSerializer(MapentityGeojsonModelSerializer):
    class Meta(MapentityGeojsonModelSerializer.Meta):
        model = models.MultiPointModel
        fields = "__all__"


class MultiLineStringModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.MultiLineStringModel
        fields = "__all__"


class MultiLineStringModelGeojsonSerializer(MapentityGeojsonModelSerializer):
    class Meta(MapentityGeojsonModelSerializer.Meta):
        model = models.MultiLineStringModel
        fields = "__all__"


class MultiPolygonModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.MultiPolygonModel
        fields = "__all__"


class MultiPolygonModelGeojsonSerializer(MapentityGeojsonModelSerializer):
    class Meta(MapentityGeojsonModelSerializer.Meta):
        model = models.MultiPolygonModel
        fields = "__all__"


class GeometryCollectionModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.GeometryCollectionModel
        fields = "__all__"


class GeometryCollectionModelGeojsonSerializer(MapentityGeojsonModelSerializer):
    class Meta(MapentityGeojsonModelSerializer.Meta):
        model = models.GeometryCollectionModel
        fields = "__all__"
