import logging

from crispy_forms.helper import FormHelper
from django.contrib import messages
from django.contrib.contenttypes.fields import (
    GenericForeignKey,
    GenericRel,
    GenericRelation,
)
from django.contrib.gis.db.models import GeometryField
from django.core.paginator import Paginator
from django.db.models import Q
from django.db.models.fields.files import FileField
from django.http import HttpResponse, HttpResponseNotFound, HttpResponseRedirect
from django.utils.translation import gettext_lazy as _
from django.views.decorators.http import last_modified as cache_last_modified
from rest_framework.decorators import action
from rest_framework.renderers import JSONRenderer
from rest_framework.response import Response

from ..filters import MapEntityFilterSet
from ..forms import MapEntityForm
from ..registry import registry
from ..serializers import json_django_dumps

logger = logging.getLogger(__name__)


class HttpJSONResponse(HttpResponse):
    def __init__(self, content="", **kwargs):
        kwargs["content_type"] = kwargs.get("content_type", "application/json")
        super().__init__(content, **kwargs)


class JSONResponseMixin:
    """
    A mixin that can be used to render a JSON/JSONP response.
    """

    response_class = HttpJSONResponse

    def render_to_response(self, context, **response_kwargs):
        """
        Returns a JSON response, transforming 'context' to make the payload.
        """
        json = self.convert_context_to_json(context)
        # If callback is specified, serve as JSONP
        callback = self.request.GET.get("callback", None)
        if callback:
            response_kwargs["content_type"] = "application/javascript"
            json = f"{callback}({json});"
        return self.response_class(json, **response_kwargs)

    def convert_context_to_json(self, context):
        "Convert the context dictionary into a JSON object"
        return json_django_dumps(context)


class LastModifiedMixin:
    def dispatch(self, *args, **kwargs):
        qs = self.queryset if self.queryset is not None else self.model.objects
        model = self.model if self.model is not None else self.queryset.model
        try:
            obj = qs.get(pk=kwargs["pk"])
        except (KeyError, model.DoesNotExist):
            return HttpResponseNotFound()

        @cache_last_modified(lambda request, *args, **kwargs: obj.get_date_update())
        def _dispatch(*args, **kwargs):
            return super(LastModifiedMixin, self).dispatch(*args, **kwargs)

        return _dispatch(*args, **kwargs)


class ModelViewMixin:
    """
    Add model meta information in context data
    """

    def get_title(self):
        return None

    def get_model(self):
        return self.model or self.queryset.model

    def get_view_perm(self):
        model = self.get_model()
        return model.get_permission_codename(self.get_entity_kind())

    def get_entity(self):
        return registry.registry[self.get_model()]

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["viewname"] = self.get_entity_kind()
        context["title"] = self.get_title()

        model = self.get_model()
        if model:
            context["model"] = model
            context["appname"] = model._meta.app_label.lower()
            context["app_verbose_name"] = model._meta.app_config.verbose_name
            context["modelname"] = model._meta.object_name.lower()
            context["objectname"] = model._meta.verbose_name
            context["objectsname"] = model._meta.verbose_name_plural
        return context


class FormViewMixin:
    """
    Dynamically create form if not specified
    """

    def get_form_class(self):
        if not self.form_class:
            _model = self.model

            class MapEntityAutoForm(MapEntityForm):
                class Meta:
                    model = _model
                    fields = "__all__"

            self.form_class = MapEntityAutoForm
        return self.form_class


class FilterListMixin:
    filterset_class = None

    def get_full_filterset(self):
        _model = self.model
        if _model is None:
            _model = self.queryset.model
        if self.filterset_class is None:

            class filterklass(MapEntityFilterSet):
                class Meta(MapEntityFilterSet.Meta):
                    model = _model
                    fields = [
                        field.name
                        for field in _model._meta.get_fields()
                        if not isinstance(
                            field,
                            (
                                GeometryField,
                                GenericRelation,
                                GenericRel,
                                GenericForeignKey,
                                FileField,
                            ),
                        )
                    ]

            return filterklass
        return self.filterset_class

    def get_minimal_filterset(self):
        _model = self.model
        if _model is None:
            _model = self.queryset.model

        if self.filterset_class is None:

            class filterklass(MapEntityFilterSet):
                class Meta(MapEntityFilterSet.Meta):
                    model = _model
                    fields = MapEntityFilterSet.Meta.fields
                    filter_overrides = MapEntityFilterSet.Meta.filter_overrides

            return filterklass
        return self.filterset_class

    def __init__(self):
        self.filterset_class = self.get_filterset_class()
        self._filterform = self.filterset_class()
        self._filterform.helper = FormHelper()
        self._filterform.helper.field_class = "form-control-sm"
        self._filterform.helper.submit = None

    def get_queryset(self):
        queryset = super().get_queryset()
        # Filter queryset from possible serialized form
        self._filterform = self.filterset_class(
            self.request.GET or None, queryset=queryset
        )
        return self._filterform.qs


class MultiObjectActionMixin:
    """
    Perform data validation before performing an action on multiple items
    """

    def get(self, request, *args, **kwargs):
        if not self.get_pks():
            messages.warning(self.request, _("At least one object must be selected"))
            return HttpResponseRedirect(self.get_success_url())

        return super().get(request, *args, **kwargs)


class AutocompleteMixin:
    autocomplete_search_fields = None
    serializer_autocomplete_class = None

    def _get_filters(self, q):
        filters = Q()
        for field in self.autocomplete_search_fields:
            filters |= Q(**{f"{field}__icontains": q})
        return filters

    def paginate_autocomplete(self, request, queryset):
        try:
            page_number = int(request.query_params.get("page", 1))
        except ValueError:
            # Handle invalid page parameter by defaulting to page 1
            page_number = 1

        try:
            page_size = int(request.query_params.get("page_size", 10))
        except ValueError:
            # Handle invalid page_size parameter by defaulting to 10
            page_size = 10

        paginator = Paginator(queryset, page_size)
        paginated_qs = paginator.get_page(page_number)
        return paginated_qs, paginated_qs.has_next()

    @action(detail=False, renderer_classes=[JSONRenderer], pagination_class=None)
    def autocomplete(self, request, *args, **kwargs):
        qs = self.get_queryset_autocomplete()
        identifier = self.request.query_params.get(
            "id"
        )  # filter with id parameter is used to retrieve a known value
        if identifier:
            qs = qs.filter(id=identifier)
            instance = qs.first()
            if instance is None:
                return Response({})
            serializer = self.serializer_autocomplete_class(instance)
            data = serializer.data

        else:
            q = self.request.query_params.get("q")
            qs, has_more = self.paginate_autocomplete(
                request, qs.filter(self._get_filters(q)) if q else qs
            )

            serializer = self.serializer_autocomplete_class(qs, many=True)
            data = {"results": serializer.data, "pagination": {"more": has_more}}

        return Response(data)
