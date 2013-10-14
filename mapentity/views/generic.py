import logging
from datetime import datetime

from django.conf import settings
from django.http import (HttpResponse, HttpResponseBadRequest,
                         HttpResponseServerError)
from django.utils.translation import ugettext_lazy as _
from django.utils.decorators import method_decorator
from django.views.generic.detail import DetailView
from django.views.generic.edit import CreateView, UpdateView, DeleteView
from django.views.generic.list import ListView
from django.views.decorators.http import last_modified as cache_last_modified
from django.core.cache import get_cache
from django.template.base import TemplateDoesNotExist
from django.template.defaultfilters import slugify
from django.contrib import messages
from django.contrib.auth.decorators import login_required

from djgeojson.views import GeoJSONLayerView
from djappypod.odt import get_template
from djappypod.response import OdtTemplateResponse

from .. import API_SRID
from .. import app_settings
from .. import models as mapentity_models
from ..helpers import convertit_url, download_to_stream
from ..decorators import save_history
from ..serializers import GPXSerializer, CSVSerializer, DatatablesSerializer, ZipShapeSerializer
from .base import history_delete
from .mixins import ModelMetaMixin, JSONResponseMixin


logger = logging.getLogger(__name__)


class MapEntityLayer(GeoJSONLayerView):
    """
    Take a class attribute `model` with a `latest_updated` method used for caching.
    """

    force2d = True
    srid = API_SRID

    def __init__(self, *args, **kwargs):
        super(MapEntityLayer, self).__init__(*args, **kwargs)
        if self.model is None:
            self.model = self.queryset.model
        # Backward compatibility with django-geojson 1.X
        # for JS ObjectsLayer and rando-trekking application
        # TODO: remove when migrated
        properties = dict([(k, k) for k in self.properties])
        if 'id' not in self.properties:
            properties['id'] = 'pk'
        self.properties = properties

    @classmethod
    def get_entity_kind(cls):
        return mapentity_models.ENTITY_LAYER

    def dispatch(self, *args, **kwargs):
        # Use lambda to bound self and to avoid passing request, *args, **kwargs as the decorator would do
        # TODO: we should be storing cache_latest and cache_latest_dispatch for reuse
        # but it triggers other problems (self.cache_latest() - will pass self as an unwanted arg)
        cache_latest = cache_last_modified(lambda x: self.model.latest_updated())
        cache_latest_dispatch = cache_latest(super(MapEntityLayer, self).dispatch)
        return cache_latest_dispatch(*args, **kwargs)

    def render_to_response(self, context, **response_kwargs):
        cache = get_cache('fat')
        key = '%s_%s_layer_json' % (self.request.LANGUAGE_CODE,
                                    self.model._meta.module_name)

        result = cache.get(key)
        latest = self.model.latest_updated()

        if result and latest:
            cache_latest, content = result
            # Not empty and still valid
            if cache_latest and cache_latest >= latest:
                return self.response_class(content=content, **response_kwargs)

        response = super(MapEntityLayer, self).render_to_response(context, **response_kwargs)
        cache.set(key, (latest, response.content))
        return response


class MapEntityList(ModelMetaMixin, ListView):
    """

    A generic view list web page.

    """
    model = None
    filterform = None
    columns = []

    def __init__(self, *args, **kwargs):
        super(MapEntityList, self).__init__(*args, **kwargs)
        self._filterform = None
        if self.model is None:
            self.model = self.queryset.model

    @classmethod
    def get_entity_kind(cls):
        return mapentity_models.ENTITY_LIST

    def can_add(self):
        return False

    def can_export(self):
        return False

    def get_queryset(self):
        queryset = super(MapEntityList, self).get_queryset()
        # Filter queryset from possible serialized form
        self._filterform = self.filterform(self.request.GET or None,
                                           queryset=queryset)
        return self._filterform.qs

    def dispatch(self, request, *args, **kwargs):
        # Save last list visited in session
        request.session['last_list'] = request.path
        return super(MapEntityList, self).dispatch(request, *args, **kwargs)

    def get_context_data(self, **kwargs):
        context = super(MapEntityList, self).get_context_data(**kwargs)
        context['can_add'] = self.can_add()
        context['can_export'] = self.can_export()
        context['datatables_ajax_url'] = self.model.get_jsonlist_url()
        context['filterform'] = self._filterform
        context['columns'] = self.columns
        context['generic_detail_url'] = self.model.get_generic_detail_url()
        return context


class MapEntityJsonList(JSONResponseMixin, MapEntityList):
    """
    Return objects list as a JSON that will populate the Jquery.dataTables.
    """

    @classmethod
    def get_entity_kind(cls):
        return mapentity_models.ENTITY_JSON_LIST

    def dispatch(self, *args, **kwargs):
        return super(ListView, self).dispatch(*args, **kwargs)  # Bypass login_required

    def get_context_data(self, **kwargs):
        """
        Override the most important part of JSONListView... (paginator)
        """
        serializer = DatatablesSerializer()
        return serializer.serialize(self.get_queryset(), fields=self.columns, model=self.model)


class MapEntityFormat(MapEntityList):
    """Make it  extends your EntityList"""
    DEFAULT_FORMAT = 'csv'

    @classmethod
    def get_entity_kind(cls):
        return mapentity_models.ENTITY_FORMAT_LIST

    def dispatch(self, *args, **kwargs):
        return super(ListView, self).dispatch(*args, **kwargs)  # Bypass session save_history

    def get_context_data(self, **kwargs):
        return {}

    def render_to_response(self, context, **response_kwargs):
        """Delegate to the fmt view function found at dispatch time"""
        formats = {
            'csv': self.csv_view,
            'shp': self.shape_view,
            'gpx': self.gpx_view,
        }
        extensions = {
            'shp': 'zip'
        }
        fmt_str = self.request.GET.get('format', self.DEFAULT_FORMAT)
        formatter = formats.get(fmt_str)
        if not formatter:
            logger.warning("Unknown serialization format '%s'" % fmt_str)
            return HttpResponseBadRequest()

        filename = '%s-%s-list' % (datetime.now().strftime('%Y%m%d-%H%M'),
                                   str(slugify(unicode(self.model._meta.verbose_name))))
        filename += '.%s' % extensions.get(fmt_str, fmt_str)
        response = formatter(request=self.request, context=context, **response_kwargs)
        response['Content-Disposition'] = 'attachment; filename=%s' % filename
        return response

    def csv_view(self, request, context, **kwargs):
        serializer = CSVSerializer()
        response = HttpResponse(mimetype='text/csv')
        serializer.serialize(queryset=self.get_queryset(), stream=response,
                             model=self.model, fields=self.columns, ensure_ascii=True)
        return response

    def shape_view(self, request, context, **kwargs):
        serializer = ZipShapeSerializer()
        response = HttpResponse(mimetype='application/zip')
        serializer.serialize(queryset=self.get_queryset(), model=self.model,
                             stream=response, fields=self.columns)
        response['Content-length'] = str(len(response.content))
        return response

    def gpx_view(self, request, context, **kwargs):
        serializer = GPXSerializer()
        response = HttpResponse(mimetype='application/gpx+xml')
        serializer.serialize(self.get_queryset(), model=self.model, stream=response,
                             geom_field=app_settings['GEOM_FIELD_NAME'])
        return response


class MapEntityMapImage(ModelMetaMixin, DetailView):
    """
    A static file view, that serves the up-to-date map image (detail screenshot)
    On error, returns 404 status.
    """
    @classmethod
    def get_entity_kind(cls):
        return mapentity_models.ENTITY_MAPIMAGE

    def render_to_response(self, context, **response_kwargs):
        try:
            obj = self.get_object()
            obj.prepare_map_image(self.request.build_absolute_uri('/'))
            response = HttpResponse(mimetype='image/png')
            # Open image file, and writes to response
            with open(obj.get_map_image_path(), 'rb') as f:
                response.write(f.read())
            return response
        except Exception as e:
            logger.exception(e)
            return HttpResponseServerError(repr(e))


class MapEntityDocument(DetailView):
    response_class = OdtTemplateResponse

    @classmethod
    def get_entity_kind(cls):
        return mapentity_models.ENTITY_DOCUMENT

    def __init__(self, *args, **kwargs):
        super(MapEntityDocument, self).__init__(*args, **kwargs)
        # Try to load template for each lang and object detail
        name_for = lambda app, modelname, lang: "%s/%s%s%s.odt" % (app, modelname, lang, self.template_name_suffix)
        langs = ['_%s' % lang for lang, langname in app_settings['LANGUAGES']]
        langs.append('')   # Will also try without lang

        def smart_get_template():
            for appname, modelname in [(self.model._meta.app_label, self.model._meta.object_name.lower()),
                                       ("mapentity", "entity")]:
                for lang in langs:
                    try:
                        template_name = name_for(appname, modelname, lang)
                        get_template(template_name)  # Will raise if not exist
                        return template_name
                    except TemplateDoesNotExist:
                        pass
            return None

        found = smart_get_template()
        if not found:
            raise TemplateDoesNotExist(name_for(self.model._meta.app_label, self.model._meta.object_name.lower(), ''))
        self.template_name = found

    def get_context_data(self, **kwargs):
        rooturl = self.request.build_absolute_uri('/')
        # Screenshot of object map is required, since present in document
        self.get_object().prepare_map_image(rooturl)
        html = self.get_object().get_attributes_html(rooturl)

        context = super(MapEntityDocument, self).get_context_data(**kwargs)
        context['datetime'] = datetime.now()
        context['STATIC_URL'] = self.request.build_absolute_uri(settings.STATIC_URL)[:-1]
        context['MEDIA_URL'] = self.request.build_absolute_uri(settings.MEDIA_URL)[:-1]
        context['MEDIA_ROOT'] = settings.MEDIA_ROOT + '/'
        context['attributeshtml'] = html
        context['_'] = _
        return context


class DocumentConvert(DetailView):
    """
    A proxy view to conversion server.
    """
    format = 'pdf'

    def source_url(self):
        raise NotImplementedError

    def render_to_response(self, context):
        source = self.request.build_absolute_uri(self.source_url())
        url = convertit_url(source, to_type=self.format)
        response = HttpResponse()
        download_to_stream(url, response, silent=True)
        return response


"""

    CRUD

"""


class MapEntityCreate(ModelMetaMixin, CreateView):
    @classmethod
    def get_entity_kind(cls):
        return mapentity_models.ENTITY_CREATE

    @classmethod
    def get_title(cls):
        name = cls.model._meta.verbose_name
        if hasattr(name, '_proxy____args'):
            name = name._proxy____args[0]  # untranslated
        # Whole "add" phrase translatable, but not catched  by makemessages
        return _(u"Add a new %s" % name.lower())

    @method_decorator(login_required)
    def dispatch(self, *args, **kwargs):
        return super(MapEntityCreate, self).dispatch(*args, **kwargs)

    def get_form_kwargs(self):
        kwargs = super(MapEntityCreate, self).get_form_kwargs()
        kwargs['user'] = self.request.user
        return kwargs

    def form_valid(self, form):
        messages.success(self.request, _("Created"))
        return super(MapEntityCreate, self).form_valid(form)

    def form_invalid(self, form):
        messages.error(self.request, _("Your form contains errors"))
        return super(MapEntityCreate, self).form_invalid(form)

    def get_context_data(self, **kwargs):
        context = super(MapEntityCreate, self).get_context_data(**kwargs)
        return context


class MapEntityDetail(ModelMetaMixin, DetailView):
    @classmethod
    def get_entity_kind(cls):
        return mapentity_models.ENTITY_DETAIL

    def get_title(self):
        return unicode(self.get_object())

    @method_decorator(login_required)
    @save_history()
    def dispatch(self, *args, **kwargs):
        return super(MapEntityDetail, self).dispatch(*args, **kwargs)

    def can_edit(self):
        return False

    def get_context_data(self, **kwargs):
        context = super(MapEntityDetail, self).get_context_data(**kwargs)
        context['activetab'] = self.request.GET.get('tab')
        context['can_edit'] = self.can_edit()
        context['can_add_attachment'] = self.can_edit()
        context['can_delete_attachment'] = self.can_edit()
        return context


class MapEntityUpdate(ModelMetaMixin, UpdateView):
    @classmethod
    def get_entity_kind(cls):
        return mapentity_models.ENTITY_UPDATE

    def get_title(self):
        return _("Edit %s") % self.get_object()

    @method_decorator(login_required)
    def dispatch(self, *args, **kwargs):
        return super(MapEntityUpdate, self).dispatch(*args, **kwargs)

    def can_delete(self):
        return True

    def get_form_kwargs(self):
        kwargs = super(MapEntityUpdate, self).get_form_kwargs()
        kwargs['user'] = self.request.user
        kwargs['can_delete'] = self.can_delete()
        return kwargs

    def form_valid(self, form):
        messages.success(self.request, _("Saved"))
        return super(MapEntityUpdate, self).form_valid(form)

    def form_invalid(self, form):
        messages.error(self.request, _("Your form contains errors"))
        return super(MapEntityUpdate, self).form_invalid(form)

    def get_success_url(self):
        return self.get_object().get_detail_url()


class MapEntityDelete(DeleteView):
    @classmethod
    def get_entity_kind(cls):
        return mapentity_models.ENTITY_DELETE

    @method_decorator(login_required)
    def dispatch(self, *args, **kwargs):
        return super(MapEntityDelete, self).dispatch(*args, **kwargs)

    def delete(self, request, *args, **kwargs):
        # Remove entry from history
        history_delete(request, path=self.get_object().get_detail_url())
        return super(MapEntityDelete, self).delete(request, *args, **kwargs)

    def get_success_url(self):
        return self.model.get_list_url()
