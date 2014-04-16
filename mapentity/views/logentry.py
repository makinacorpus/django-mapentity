# -*- coding: utf-8 -*-
from .generic import (MapEntityList, MapEntityJsonList, MapEntityDetail,
                      MapEntityFormat, MapEntityLayer)
from ..filters import BaseMapEntityFilterSet
from ..models import LogEntry
from .. import registry


class LogEntryFilter(BaseMapEntityFilterSet):
    class Meta:
        model = LogEntry
        fields = ('user', )


class LogEntryList(MapEntityList):
    model = LogEntry
    filterform = LogEntryFilter
    columns = ('id', 'action_time', 'user', 'object', 'action_flag')

    def get_queryset(self):
        queryset = super(LogEntryList, self).get_queryset()
        return queryset.filter(content_type_id__in=registry.content_type_ids)

    def get_context_data(self, **kwargs):
        context = super(LogEntryList, self).get_context_data(**kwargs)
        context['can_add'] = False  # There is no LogEntryCreate view
        return context


class LogEntryJsonList(MapEntityJsonList, LogEntryList):
    pass


class LogEntryDetail(MapEntityDetail):
    model = LogEntry


class LogEntryFormat(MapEntityFormat):
    model = LogEntry
    filterform = LogEntryFilter


class LogEntryLayer(MapEntityLayer):
    model = LogEntry
