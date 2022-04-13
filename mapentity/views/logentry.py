import django_filters
from django import forms
from rest_framework import serializers

from . import MapEntityViewSet
from .generic import MapEntityList
from ..filters import BaseMapEntityFilterSet
from ..models import LogEntry
from ..registry import registry


class LogEntryFilter(BaseMapEntityFilterSet):
    content_type = django_filters.NumberFilter(widget=forms.HiddenInput)
    object_id = django_filters.NumberFilter(widget=forms.HiddenInput)

    class Meta:
        model = LogEntry
        fields = ('user', 'content_type', 'object_id')


class LogEntryList(MapEntityList):
    queryset = LogEntry.objects.order_by('-action_time')
    filterform = LogEntryFilter
    columns = ('id', 'action_time', 'user', 'object', 'action_flag')
    unorderable_columns = ('object', )

    def get_queryset(self):
        queryset = super().get_queryset()
        return queryset.filter(content_type_id__in=registry.content_type_ids)


class LogEntrySerializer(serializers.ModelSerializer):
    user = serializers.SlugRelatedField('username', read_only=True)
    object = serializers.CharField(source='object_display')
    action_flag = serializers.CharField(source='get_action_flag_display')

    class Meta:
        fields = "__all__"
        model = LogEntry


class LogEntryViewSet(MapEntityViewSet):
    model = LogEntry
    filterset_class = LogEntryFilter
    serializer_class = LogEntrySerializer

    def get_queryset(self):
        qs = self.model.objects.order_by('-action_time')
        return qs.filter(content_type_id__in=registry.content_type_ids)
