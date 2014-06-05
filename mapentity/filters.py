from datetime import datetime

from django import forms as django_forms
from django.db.models.related import RelatedObject
from django.conf import settings
from django.utils.translation import ugettext_lazy as _

from django_filters import FilterSet, Filter, ChoiceFilter
from django_filters.filterset import get_model_field
import floppyforms as forms

from .settings import app_settings, API_SRID
from .widgets import HiddenGeometryWidget


class YearFilter(ChoiceFilter):
    def __init__(self, *args, **kwargs):
        self.first_choice = kwargs.get('label', _('Any year'))
        kwargs['choices'] = self.get_choices()
        super(YearFilter, self).__init__(*args, **kwargs)

    def get_choices(self):
        # idx 0 will not be a year !
        years_range = [self.first_choice] + self.get_years()
        return [(idx, year) for idx, year in enumerate(years_range)]

    def get_years(self):
        return range(datetime.today().year, 1979, -1)

    def do_filter(self, qs, year):
        return qs.filter(**{
            '%s__year' % self.name: year,
        })

    def filter(self, qs, value):
        try:
            idx = int(value)
        except (ValueError, TypeError):
            idx = 0

        if idx == 0:
            return qs
        else:
            year = self.get_years()[idx - 1]
            return self.do_filter(qs, year)


class YearBetweenFilter(YearFilter):

    def __init__(self, *args, **kwargs):
        assert len(kwargs['name']) == 2
        super(YearBetweenFilter, self).__init__(*args, **kwargs)

    def do_filter(self, qs, year):
        begin, end = self.name
        return qs.filter(**{
            '%s__lte' % begin: year,
            '%s__gte' % end: year,
        })


class PolygonFilter(Filter):

    field_class = forms.gis.PolygonField

    def __init__(self, *args, **kwargs):
        kwargs.setdefault('name', app_settings['GEOM_FIELD_NAME'])
        kwargs.setdefault('widget', HiddenGeometryWidget)
        kwargs.setdefault('lookup_type', 'intersects')
        super(PolygonFilter, self).__init__(*args, **kwargs)


class PythonPolygonFilter(PolygonFilter):

    def filter(self, qs, value):
        if not value:
            return qs
        if not value.srid:
            value.srid = API_SRID
        value.transform(settings.SRID)
        filtered = []
        for o in qs.all():
            geom = getattr(o, self.name)
            if geom and geom.valid and not geom.empty:
                if getattr(geom, self.lookup_type)(value):
                    filtered.append(o.pk)
            else:
                filtered.append(o.pk)
        return qs.filter(pk__in=filtered)


class BaseMapEntityFilterSet(FilterSet):
    def __init__(self, *args, **kwargs):
        super(BaseMapEntityFilterSet, self).__init__(*args, **kwargs)
        self.__bypass_labels()

    def __bypass_labels(self):
        """
        These hacks allow to bypass field labels. Using either placeholders,
        empty choices label, etc. This allows to greatly save space in form layout,
        which is required for concise filter forms.
        """
        for fieldname in self.base_filters.keys():
            field = self.form.fields[fieldname]
            if isinstance(field, django_forms.MultiValueField):
                for i, widget in enumerate(field.widget.widgets):
                    self.__set_placeholder(field.fields[i], widget)
            elif isinstance(field, django_forms.ChoiceField):
                field.empty_label = field.label
                self.__set_placeholder(field, field.widget)
            elif isinstance(field, django_forms.NullBooleanField):
                choices = [(u'1', field.label)] + field.widget.choices[1:]
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
            if isinstance(field, RelatedObject):
                filter_ = cls.filter_for_reverse_field(field, name)
            else:
                filter_ = cls.filter_for_field(field, name)
        cls.base_filters[name] = filter_

    @classmethod
    def add_filters(cls, filters):
        for name, filter_ in filters.items():
            filter_.name = name
            cls.add_filter(name, filter_)


class MapEntityFilterSet(BaseMapEntityFilterSet):
    bbox = PolygonFilter()

    class Meta:
        fields = ['bbox']
