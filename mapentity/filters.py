from django.conf import settings
from django.contrib.gis import forms
from django.contrib.gis.geos import Polygon
from django.db.models.fields.related import ForeignKey, ManyToOneRel
from django_filters import Filter, ModelMultipleChoiceFilter
from django_filters.filterset import get_model_field, remote_queryset
from django_filters.rest_framework import FilterSet

from mapentity.settings import API_SRID, app_settings
from mapentity.widgets import HiddenGeometryWidget


class PolygonFilter(Filter):
    field_class = forms.PolygonField

    def __init__(self, *args, **kwargs):
        kwargs.setdefault("field_name", app_settings["GEOM_FIELD_NAME"])
        kwargs.setdefault("widget", HiddenGeometryWidget)
        kwargs.setdefault("lookup_expr", "intersects")
        super().__init__(*args, **kwargs)

    def get_value_with_bounds_fixed(self, value):
        if value:
            # prevent bbox out of bounding (leaflet getBounds)
            xmin, ymin, xmax, ymax = value.extent
            xmin = max(xmin, -180)
            xmax = min(xmax, 180)
            ymin = max(ymin, -90)
            ymax = min(ymax, 90)
            new_bbox = Polygon.from_bbox((xmin, ymin, xmax, ymax))
            new_bbox.srid = value.srid
            return new_bbox
        return value

    def filter(self, qs, value):
        value = self.get_value_with_bounds_fixed(value)
        return super().filter(qs, value)


class PythonPolygonFilter(PolygonFilter):
    def filter(self, qs, value):
        value = self.get_value_with_bounds_fixed(value)
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
        field.help_text = ""  # Hide help text
        widget.attrs["placeholder"] = field.label
        widget.attrs["data-placeholder"] = field.label
        widget.attrs["title"] = field.label
        widget.attrs["data-label"] = field.label

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
    bbox = PolygonFilter()

    class Meta:
        fields = ["bbox"]
        filter_overrides = {
            ForeignKey: {
                "filter_class": ModelMultipleChoiceFilter,
                "extra": lambda f: {
                    "queryset": remote_queryset(f),
                },
            },
        }
