import django_filters

from mapentity.filters import MapEntityFilterSet

from test_app.models import Event


class AfterFilter(django_filters.DateFilter):
    def filter(self, qs, value):
        if not value:
            return qs
        return qs.filter(end_date__gte=value)


class BeforeFilter(django_filters.DateFilter):
    def filter(self, qs, value):
        if not value:
            return qs
        return qs.filter(begin_date__lte=value)


class EventFilterSet(MapEntityFilterSet):
    after = AfterFilter(label="After")
    before = BeforeFilter(label="Before")

    class Meta(MapEntityFilterSet.Meta):
        model = Event
        fields = MapEntityFilterSet.Meta.fields + [
            'tags', 'before', 'after',
        ]
