# -*- coding: utf-8 -*-
import django_filters
from django import forms
from .generic import MapEntityList
from ..filters import BaseMapEntityFilterSet
from ..models import LogEntry
from .. import registry


class LogEntryFilter(BaseMapEntityFilterSet):
    content_type = django_filters.NumberFilter(widget=forms.HiddenInput)
    object_id = django_filters.NumberFilter(widget=forms.HiddenInput)

    class Meta:
        model = LogEntry
        fields = ('user', 'content_type', 'object_id')


class LogEntryList(MapEntityList):
    model = LogEntry
    filterform = LogEntryFilter
    columns = ('id', 'action_time', 'user', 'object', 'action')

    def get_queryset(self):
        queryset = super(LogEntryList, self).get_queryset()
        return queryset.filter(content_type_id__in=registry.content_type_ids)
