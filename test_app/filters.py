from django_filters.rest_framework import BooleanFilter

from mapentity.filters import MapEntityFilterSet
from test_app.models import DummyModel


class DummyModelFilter(MapEntityFilterSet):
    public = BooleanFilter(field_name='public', lookup_expr='exact')

    class Meta:
        model = DummyModel
        fields = ('public', 'name')
