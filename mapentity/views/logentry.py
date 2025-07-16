import django_filters
from django import forms
from rest_framework import serializers
from rest_framework_gis import serializers as gis_serializers

from ..filters import BaseMapEntityFilterSet
from ..models import LogEntry
from ..registry import registry
from ..serializers import MapentityGeojsonModelSerializer
from . import MapEntityFilter, MapEntityViewSet
from .generic import MapEntityList


class LogEntryFilterSet(BaseMapEntityFilterSet):
    content_type = django_filters.NumberFilter(widget=forms.HiddenInput)
    object_id = django_filters.NumberFilter(widget=forms.HiddenInput)

    class Meta:
        model = LogEntry
        fields = ("user", "content_type", "object_id")


class LogEntryFilter(MapEntityFilter):
    model = LogEntry
    filterset_class = LogEntryFilterSet


class LogEntryList(MapEntityList):
    queryset = LogEntry.objects.order_by("-action_time")
    filterform = LogEntryFilterSet
    columns = ("id", "action_time", "user", "object", "action_flag")
    unorderable_columns = ("object",)

    def get_queryset(self):
        queryset = super().get_queryset()
        return queryset.filter(content_type_id__in=registry.content_type_ids)


class LogEntrySerializer(serializers.ModelSerializer):
    user = serializers.SlugRelatedField("username", read_only=True)
    object = serializers.CharField(source="object_display")
    action_flag = serializers.CharField(source="get_action_flag_display")

    class Meta:
        fields = "__all__"
        model = LogEntry


class LogEntryGeoJSONSerializer(MapentityGeojsonModelSerializer):
    api_geom = gis_serializers.GeometryField(source="geom")

    class Meta(MapentityGeojsonModelSerializer.Meta):
        model = LogEntry
        fields = ("id",)


class LogEntryViewSet(MapEntityViewSet):
    model = LogEntry
    filterset_class = LogEntryFilterSet
    serializer_class = LogEntrySerializer
    geojson_serializer_class = LogEntryGeoJSONSerializer

    def get_queryset(self):
        qs = self.model.objects.order_by("-action_time")
        return qs.filter(content_type_id__in=registry.content_type_ids)
