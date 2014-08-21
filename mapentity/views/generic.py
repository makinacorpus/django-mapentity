import os
import logging
from datetime import datetime

from django.conf import settings
from django.http import (HttpResponse, HttpResponseBadRequest,
                         HttpResponseServerError)
from django.utils.translation import ugettext_lazy as _
from django.utils.decorators import method_decorator
from django.utils.encoding import force_text
from django.views.generic.detail import DetailView
from django.views.generic import View
from django.views.generic.edit import CreateView, UpdateView, DeleteView
from django.views.generic.list import ListView
from django.contrib.gis.db.models import GeometryField
from django.template.base import TemplateDoesNotExist
from django.template.defaultfilters import slugify
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from djgeojson.views import GeoJSONLayerView
from djappypod.odt import get_template
from djappypod.response import OdtTemplateResponse

from ..settings import app_settings, API_SRID
from .. import models as mapentity_models
from ..helpers import convertit_url, download_to_stream, user_has_perm
from ..decorators import (save_history, view_permission_required,
                          view_cache_latest, view_cache_response_content)
from ..models import LogEntry, ADDITION, CHANGE, DELETION
from ..serializers import GPXSerializer, CSVSerializer, DatatablesSerializer, ZipShapeSerializer
from .base import history_delete
from .mixins import (ModelViewMixin, JSONResponseMixin, FormViewMixin,
                     FilterListMixin)


logger = logging.getLogger(__name__)


def log_action(request, object, action_flag):
    if not app_settings['ACTION_HISTORY_ENABLED']:
        return
    LogEntry.objects.log_action(
        user_id=request.user.pk,
        content_type_id=object.get_content_type_id(),
        object_id=object.pk,
        object_repr=force_text(object),
        action_flag=action_flag
    )


class MapEntityLayer(FilterListMixin, ModelViewMixin, GeoJSONLayerView):
    """
    Take a class attribute `model` with a `latest_updated` method used for caching.
    """

    force2d = True
    srid = API_SRID

    def __init__(self, *args, **kwargs):
        super(MapEntityLayer, self).__init__(*args, **kwargs)
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

    @view_permission_required()
    @view_cache_latest()
    def dispatch(self, *args, **kwargs):
        return super(MapEntityLayer, self).dispatch(*args, **kwargs)

    @view_cache_response_content()
    def render_to_response(self, context, **response_kwargs):
        return super(MapEntityLayer, self).render_to_response(context, **response_kwargs)


class BaseListView(FilterListMixin, ModelViewMixin):

    columns = None

    def __init__(self, *args, **kwargs):
        super(BaseListView, self).__init__(*args, **kwargs)

        if self.columns is None:
            # All model fields except geometries
            self.columns = [field.name for field in self.get_model()._meta.fields
                            if not isinstance(field, GeometryField)]
            # Id column should be the first one
            self.columns.remove('id')
            self.columns.insert(0, 'id')

    @view_permission_required()
    def dispatch(self, *args, **kwargs):
        return super(BaseListView, self).dispatch(*args, **kwargs)


class MapEntityList(BaseListView, ListView):
    """

    A generic view list web page.

    """

    def get_template_names(self):
        default = super(MapEntityList, self).get_template_names()
        return default + ['mapentity/mapentity_list.html']

    @classmethod
    def get_entity_kind(cls):
        return mapentity_models.ENTITY_LIST

    @view_permission_required(login_url='login')
    def dispatch(self, request, *args, **kwargs):
        # Save last list visited in session
        # (only if viewing a true list, not an inherited ENTITY_JSON_LIST for ex.)
        if self.__class__.get_entity_kind() == mapentity_models.ENTITY_LIST:
            request.session['last_list'] = request.path
        return super(MapEntityList, self).dispatch(request, *args, **kwargs)

    def get_context_data(self, **kwargs):
        context = super(MapEntityList, self).get_context_data(**kwargs)
        context['filterform'] = self._filterform  # From FilterListMixin
        context['columns'] = self.columns  # From BaseListView

        context['create_label'] = self.get_model().get_create_label()

        model = self.get_model()
        perm_create = model.get_permission_codename(mapentity_models.ENTITY_CREATE)
        can_add = user_has_perm(self.request.user, perm_create)
        context['can_add'] = can_add

        perm_export = model.get_permission_codename(mapentity_models.ENTITY_FORMAT_LIST)
        can_export = user_has_perm(self.request.user, perm_export)
        context['can_export'] = can_export

        return context


class MapEntityJsonList(JSONResponseMixin, BaseListView, ListView):
    """
    Return objects list as a JSON that will populate the Jquery.dataTables.
    """

    @classmethod
    def get_entity_kind(cls):
        return mapentity_models.ENTITY_JSON_LIST

    def get_context_data(self, **kwargs):
        """
        Override the most important part of JSONListView... (paginator)
        """
        serializer = DatatablesSerializer()
        return serializer.serialize(self.get_queryset(),
                                    fields=self.columns,
                                    model=self.get_model())


class MapEntityFormat(BaseListView, ListView):
    """Make it  extends your EntityList"""
    DEFAULT_FORMAT = 'csv'

    @classmethod
    def get_entity_kind(cls):
        return mapentity_models.ENTITY_FORMAT_LIST

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


class MapEntityMapImage(ModelViewMixin, DetailView):
    """
    A static file view, that serves the up-to-date map image (detail screenshot)
    On error, returns 404 status.
    """
    @classmethod
    def get_entity_kind(cls):
        return mapentity_models.ENTITY_MAPIMAGE

    @view_permission_required()
    def dispatch(self, *args, **kwargs):
        return super(MapEntityMapImage, self).dispatch(*args, **kwargs)

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


class MapEntityDocument(ModelViewMixin, DetailView):
    response_class = OdtTemplateResponse

    @classmethod
    def get_entity_kind(cls):
        return mapentity_models.ENTITY_DOCUMENT

    def __init__(self, *args, **kwargs):
        super(MapEntityDocument, self).__init__(*args, **kwargs)
        # Try to load template for each lang and object detail
        model = self.get_model()
        name_for = lambda app, modelname, lang: "%s/%s%s%s.odt" % (app, modelname, lang, self.template_name_suffix)
        langs = ['_%s' % lang for lang, langname in app_settings['LANGUAGES']]
        langs.append('')   # Will also try without lang

        def smart_get_template():
            for appname, modelname in [(model._meta.app_label, model._meta.object_name.lower()),
                                       ("mapentity", "mapentity")]:
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
            raise TemplateDoesNotExist(name_for(model._meta.app_label, model._meta.object_name.lower(), ''))
        self.template_name = found

    @view_permission_required()
    def dispatch(self, *args, **kwargs):
        return super(MapEntityDocument, self).dispatch(*args, **kwargs)

    def get_context_data(self, **kwargs):
        rooturl = self.request.build_absolute_uri('/')

        # Screenshot of object map is required, since present in document
        self.get_object().prepare_map_image(rooturl)

        context = super(MapEntityDocument, self).get_context_data(**kwargs)
        context['datetime'] = datetime.now()
        context['STATIC_URL'] = self.request.build_absolute_uri(settings.STATIC_URL)[:-1]
        context['MEDIA_URL'] = self.request.build_absolute_uri(settings.MEDIA_URL)[:-1]
        context['MEDIA_ROOT'] = settings.MEDIA_ROOT + '/'
        context['attributeshtml'] = self.get_object().get_attributes_html(self.request)
        context['objecticon'] = os.path.join(settings.STATIC_ROOT, self.get_entity().icon_big)
        context['_'] = _
        return context


class Convert(View):
    """
    A proxy view to conversion server.
    """
    format = 'pdf'
    http_method_names = ['get']

    def source_url(self):
        return self.request.GET.get('url')

    @method_decorator(login_required)
    def dispatch(self, *args, **kwargs):
        return super(Convert, self).dispatch(*args, **kwargs)

    def get(self, request, *args, **kwargs):
        source = self.source_url()
        if source is None:
            return HttpResponseBadRequest('url parameter missing')

        if not source.startswith('http'):
            source = self.request.build_absolute_uri(source)

        fromtype = request.GET.get('from')
        format = request.GET.get('to', self.format)
        url = convertit_url(source, from_type=fromtype, to_type=format)

        response = HttpResponse()
        received = download_to_stream(url, response,
                                      silent=True,
                                      headers=self.request_headers())
        if received:
            filename = os.path.basename(received.url)
            response['Content-Disposition'] = 'attachment; filename=%s' % filename
        return response

    def request_headers(self):
        """Retrieves the original HTTP headers of this view request.
        Django converts header names to upper-case with underscores.

        See http://stackoverflow.com/questions/3889769/get-all-request-headers-in-django
        """
        excluded = ['HTTP_COOKIE', 'HTTP_HOST']
        headers = []
        for name, value in self.request.META.items():
            if name.startswith('HTTP_') and name not in excluded:
                realname = name.replace('HTTP_', '').replace('_', '-').title()
                headers.append((realname, value))
        return dict(headers)


class DocumentConvert(Convert, DetailView):
    """
    Convert the object's document to PDF
    """
    def source_url(self):
        return self.get_object().get_document_url()


"""

    CRUD

"""


class MapEntityCreate(ModelViewMixin, FormViewMixin, CreateView):

    @classmethod
    def get_entity_kind(cls):
        return mapentity_models.ENTITY_CREATE

    def get_template_names(self):
        default = super(MapEntityCreate, self).get_template_names()
        return default + ['mapentity/mapentity_form.html']

    @classmethod
    def get_title(cls):
        return cls.model.get_create_label()

    @view_permission_required(login_url=mapentity_models.ENTITY_LIST)
    def dispatch(self, *args, **kwargs):
        return super(MapEntityCreate, self).dispatch(*args, **kwargs)

    def get_form_kwargs(self):
        kwargs = super(MapEntityCreate, self).get_form_kwargs()
        kwargs['user'] = self.request.user
        return kwargs

    def form_valid(self, form):
        response = super(MapEntityCreate, self).form_valid(form)
        messages.success(self.request, _("Created"))
        log_action(self.request, self.object, ADDITION)
        return response

    def form_invalid(self, form):
        messages.error(self.request, _("Your form contains errors"))
        return super(MapEntityCreate, self).form_invalid(form)

    def get_context_data(self, **kwargs):
        context = super(MapEntityCreate, self).get_context_data(**kwargs)
        return context


class MapEntityDetail(ModelViewMixin, DetailView):

    @classmethod
    def get_entity_kind(cls):
        return mapentity_models.ENTITY_DETAIL

    def get_template_names(self):
        default = super(MapEntityDetail, self).get_template_names()
        return default + ['mapentity/mapentity_detail.html']

    def get_title(self):
        return unicode(self.get_object())

    @view_permission_required(login_url=mapentity_models.ENTITY_LIST)
    @save_history()
    def dispatch(self, *args, **kwargs):
        return super(MapEntityDetail, self).dispatch(*args, **kwargs)

    def get_context_data(self, **kwargs):
        context = super(MapEntityDetail, self).get_context_data(**kwargs)
        logentries_max = app_settings['ACTION_HISTORY_LENGTH']
        logentries = LogEntry.objects.filter(
            content_type_id=self.object.get_content_type_id(),
            object_id=self.object.pk
        ).order_by('-id')
        context['activetab'] = self.request.GET.get('tab')
        context['empty_map_message'] = _("No map available for this object.")
        context['logentries'] = logentries[:logentries_max]
        context['logentries_hellip'] = logentries.count() > logentries_max

        perm_update = self.get_model().get_permission_codename(mapentity_models.ENTITY_UPDATE)
        can_edit = user_has_perm(self.request.user, perm_update)
        context['can_edit'] = can_edit
        context['can_read_attachment'] = user_has_perm(self.request.user, 'paperclip.read_attachment')
        context['can_add_attachment'] = user_has_perm(self.request.user, 'paperclip.add_attachment')
        context['can_delete_attachment'] = user_has_perm(self.request.user, 'paperclip.delete_attachment')

        return context


class MapEntityUpdate(ModelViewMixin, FormViewMixin, UpdateView):

    @classmethod
    def get_entity_kind(cls):
        return mapentity_models.ENTITY_UPDATE

    def get_template_names(self):
        default = super(MapEntityUpdate, self).get_template_names()
        return default + ['mapentity/mapentity_form.html']

    def get_title(self):
        return _("Edit %s") % self.get_object()

    @view_permission_required(login_url=mapentity_models.ENTITY_DETAIL)
    def dispatch(self, *args, **kwargs):
        return super(MapEntityUpdate, self).dispatch(*args, **kwargs)

    def get_form_kwargs(self):
        kwargs = super(MapEntityUpdate, self).get_form_kwargs()
        kwargs['user'] = self.request.user

        perm_delete = self.get_model().get_permission_codename(mapentity_models.ENTITY_DELETE)
        can_delete = user_has_perm(self.request.user, perm_delete)
        kwargs['can_delete'] = can_delete
        return kwargs

    def form_valid(self, form):
        response = super(MapEntityUpdate, self).form_valid(form)
        messages.success(self.request, _("Saved"))
        log_action(self.request, self.object, CHANGE)
        return response

    def form_invalid(self, form):
        messages.error(self.request, _("Your form contains errors"))
        return super(MapEntityUpdate, self).form_invalid(form)

    def get_success_url(self):
        return self.get_object().get_detail_url()


class MapEntityDelete(ModelViewMixin, DeleteView):

    @classmethod
    def get_entity_kind(cls):
        return mapentity_models.ENTITY_DELETE

    def get_template_names(self):
        default = super(MapEntityDelete, self).get_template_names()
        return default + ['mapentity/mapentity_confirm_delete.html']

    @view_permission_required(login_url=mapentity_models.ENTITY_DETAIL)
    def dispatch(self, *args, **kwargs):
        return super(MapEntityDelete, self).dispatch(*args, **kwargs)

    def delete(self, request, *args, **kwargs):
        self.object = self.get_object()
        log_action(self.request, self.object, DELETION)
        # Remove entry from history
        history_delete(request, path=self.object.get_detail_url())
        return super(MapEntityDelete, self).delete(request, *args, **kwargs)

    def get_success_url(self):
        return self.get_model().get_list_url()


MAPENTITY_GENERIC_VIEWS = [
    MapEntityLayer,
    MapEntityList,
    MapEntityJsonList,
    MapEntityFormat,
    MapEntityMapImage,
    MapEntityDocument,
    MapEntityCreate,
    MapEntityDetail,
    MapEntityUpdate,
    MapEntityDelete,
]
