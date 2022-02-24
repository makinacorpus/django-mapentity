from django.conf import settings
from django.contrib.gis import forms
from django.db.models.fields.related import ManyToOneRel, ForeignKey
from django.forms import HiddenInput
from django_filters import ModelMultipleChoiceFilter, CharFilter, Filter
from django_filters.filterset import get_model_field, remote_queryset
from django_filters.rest_framework import FilterSet
from rest_framework_gis.filters import InBBoxFilter

from mapentity.settings import app_settings, API_SRID
from mapentity.widgets import HiddenGeometryWidget


class PolygonFilter(Filter):
    field_class = forms.PolygonField

    def __init__(self, *args, **kwargs):
        kwargs.setdefault('field_name', app_settings['GEOM_FIELD_NAME'])
        kwargs.setdefault('widget', HiddenGeometryWidget)
        kwargs.setdefault('lookup_expr', 'intersects')
        super().__init__(*args, **kwargs)


class PythonPolygonFilter(PolygonFilter):

    def filter(self, qs, value):
        if not value:
            return qs
        if not value.srid:
            value.srid = API_SRID
        value.transform(settings.SRID)
        filtered = []
        for o in qs.all():
            geom = getattr(o, self.field_name)
            if geom and geom.valid and not geom.empty:
                if getattr(geom, self.lookup_expr)(value):
                    filtered.append(o.pk)
            else:
                filtered.append(o.pk)
        return qs.filter(pk__in=filtered)


class MapentityInBBoxFilter(InBBoxFilter):
    """
    Override DRF gis InBBOXFilter with coreapi field descriptors
    """

    def get_filter_bbox(self, request):
        """ Transform bbox to internal SRID to get working """
        bbox = super().get_filter_bbox(request)
        if bbox:
            bbox.srid = 4326
            if bbox.srid != settings.SRID:
                bbox.transform(settings.SRID)
        return bbox


class BaseMapEntityFilterSet(FilterSet):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.__bypass_labels()

    def __bypass_labels(self):
        """
        These hacks allow to bypass field labels. Using either placeholders,
        empty choices label, etc. This allows to greatly save space in form layout,
        which is required for concise filter forms.
        """
        for fieldname in self.base_filters.keys():
            field = self.form.fields[fieldname]
            if isinstance(field, forms.MultiValueField):
                for i, widget in enumerate(field.widget.widgets):
                    self.__set_placeholder(field.fields[i], widget)
            elif isinstance(field, forms.ChoiceField):
                self.__set_placeholder(field, field.widget)
            elif isinstance(field, forms.NullBooleanField):
                # use label as undefined value for NullBooleanField
                choices = [(None, field.label)] + field.widget.choices[1:]
                field.widget.choices = choices
                self.__set_placeholder(field, field.widget)
            else:
                self.__set_placeholder(field, field.widget)

    def __set_placeholder(self, field, widget):
        field.help_text = ''  # Hide help text
        widget.attrs['placeholder'] = field.label
        widget.attrs['data-placeholder'] = field.label
        widget.attrs['title'] = field.label
        widget.attrs['data-label'] = field.label

    @classmethod
    def add_filter(cls, name, filter_=None):
        field = get_model_field(cls._meta.model, name)
        if filter_ is None:
            if isinstance(field, ManyToOneRel):
                filter_ = cls.filter_for_reverse_field(field, name)
            else:
                filter_ = cls.filter_for_field(field, name)
        cls.base_filters[name] = filter_

    @classmethod
    def add_filters(cls, filters):
        for name, filter_ in filters.items():
            filter_.field_name = name
            cls.add_filter(name, filter_)


class MapEntityFilterSet(BaseMapEntityFilterSet):
    in_bbox = CharFilter(widget=HiddenInput(), method='filter_in_bbox')  # filterset input for InBBoxFilter

    def filter_in_bbox(self, queryset, name, value):
        """ Fake filter field. this filter is done by InBBoxFilter """
        return queryset

    class Meta:
        fields = ['in_bbox']
        filter_overrides = {
            ForeignKey: {
                'filter_class': ModelMultipleChoiceFilter,
                'extra': lambda f: {
                    'queryset': remote_queryset(f),
                }
            },
        }
