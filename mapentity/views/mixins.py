import logging

from django.http import HttpResponse, HttpResponseNotFound
from django.views.decorators.http import last_modified as cache_last_modified
from ..serializers import json_django_dumps
from .. import models as mapentity_models


logger = logging.getLogger(__name__)


class HttpJSONResponse(HttpResponse):
    def __init__(self, content='', **kwargs):
        kwargs['content_type'] = kwargs.get('content_type', 'application/json')
        super(HttpJSONResponse, self).__init__(content, **kwargs)


class JSONResponseMixin(object):
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
        callback = self.request.GET.get('callback', None)
        if callback:
            response_kwargs['content_type'] = 'application/javascript'
            json = u"%s(%s);" % (callback, json)
        return self.response_class(json, **response_kwargs)

    def convert_context_to_json(self, context):
        "Convert the context dictionary into a JSON object"
        return json_django_dumps(context)


class LastModifiedMixin(object):
    def dispatch(self, *args, **kwargs):
        qs = self.queryset or self.model.objects
        model = self.model or self.queryset.model
        try:
            obj = qs.get(pk=kwargs['pk'])
        except (KeyError, model.DoesNotExist):
            return HttpResponseNotFound()

        @cache_last_modified(lambda request, pk: obj.date_update)
        def _dispatch(*args, **kwargs):
            return super(LastModifiedMixin, self).dispatch(*args, **kwargs)
        return _dispatch(*args, **kwargs)


class ModelViewMixin(object):
    """
    Add model meta information in context data
    """

    def get_view_perm(self):
        operations = {
            mapentity_models.ENTITY_CREATE: mapentity_models.ENTITY_PERMISSION_CREATE,
            mapentity_models.ENTITY_UPDATE: mapentity_models.ENTITY_PERMISSION_UPDATE,
            mapentity_models.ENTITY_DELETE: mapentity_models.ENTITY_PERMISSION_DELETE,

            mapentity_models.ENTITY_DETAIL: mapentity_models.ENTITY_PERMISSION_READ,
            mapentity_models.ENTITY_LAYER: mapentity_models.ENTITY_PERMISSION_READ,
            mapentity_models.ENTITY_LIST: mapentity_models.ENTITY_PERMISSION_READ,
            mapentity_models.ENTITY_JSON_LIST: mapentity_models.ENTITY_PERMISSION_READ,

            mapentity_models.ENTITY_FORMAT_LIST: mapentity_models.ENTITY_PERMISSION_EXPORT,
            mapentity_models.ENTITY_MAPIMAGE: mapentity_models.ENTITY_PERMISSION_EXPORT,
            mapentity_models.ENTITY_DOCUMENT: mapentity_models.ENTITY_PERMISSION_EXPORT,
        }
        operation = operations.get(self.get_entity_kind(),
                                   self.get_entity_kind())
        model = self.model or self.queryset.model
        return model.get_permission_name(operation)

    @classmethod
    def get_entity_kind(self):
        return None

    def get_title(self):
        return None

    def get_context_data(self, **kwargs):
        context = super(ModelViewMixin, self).get_context_data(**kwargs)
        context['view'] = self.get_entity_kind()
        context['title'] = self.get_title()

        model = self.model or self.queryset.model
        if model:
            context['model'] = model
            context['appname'] = model._meta.app_label.lower()
            context['modelname'] = model._meta.object_name.lower()
            context['objectsname'] = model._meta.verbose_name_plural
        return context
