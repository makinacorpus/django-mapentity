# -*- coding: utf-8 -*-
import os
import sys
import urllib2
import logging
import traceback
from datetime import datetime
import json
import mimetypes

from django.conf import settings
from django.contrib.auth.decorators import login_required, permission_required
from django.http import (HttpResponse, HttpResponseBadRequest,
                         HttpResponseServerError)
from django.core.urlresolvers import reverse
from django.views.defaults import page_not_found, permission_denied
from django.views.generic.base import TemplateView
from django.views import static
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.template import RequestContext, Context, loader

from ..settings import app_settings, _MAP_STYLES
from ..helpers import capture_image
from .. import urlizor
from .mixins import JSONResponseMixin


logger = logging.getLogger(__name__)


def handler403(request, template_name='mapentity/403.html'):
    return permission_denied(request, template_name)


def handler404(request, template_name='mapentity/404.html'):
    return page_not_found(request, template_name)


def handler500(request, template_name='mapentity/500.html'):
    """
    500 error handler which tries to use a RequestContext - unless an error
    is raised, in which a normal Context is used with just the request
    available.

    Templates: `500.html`
    Context: None
    """
    # Try returning using a RequestContext
    try:
        context = RequestContext(request)
    except:
        logger.warn('Error getting RequestContext for ServerError page.')
        context = Context({'request': request})
    e, name, tb = sys.exc_info()
    context['exception'] = repr(name)
    context['stack'] = "\n".join(traceback.format_tb(tb))
    t = loader.get_template(template_name)
    response = t.render(context)
    return HttpResponseServerError(response)


@permission_required('paperclip.read_attachment',
                     raise_exception=True)
def serve_secure_media(request, path):
    """
    Serve media/ for authenticated users only, since it can contain sensitive
    information (uploaded documents, map screenshots, ...)
    """
    if path.startswith('/'):
        path = path[1:]

    content_type, encoding = mimetypes.guess_type(path)

    if settings.DEBUG:
        response = static.serve(request, path, settings.MEDIA_ROOT)
    else:
        response = HttpResponse()
        response['X-Accel-Redirect'] = os.path.join(settings.MEDIA_URL_SECURE, path)
    response["Content-Type"] = content_type or 'application/octet-stream'
    if encoding:
        response["Content-Encoding"] = encoding
    if app_settings['SERVE_MEDIA_AS_ATTACHMENT']:
        response['Content-Disposition'] = "attachment; filename={0}".format(
            os.path.basename(path))
    return response


class JSSettings(JSONResponseMixin, TemplateView):
    """
    Javascript settings, in JSON format.
    Likely to be overriden. Contains only necessary stuff
    for mapentity.
    """
    def get_context_data(self):
        dictsettings = {}
        dictsettings['debug'] = settings.DEBUG
        dictsettings['map'] = dict(
            extent=getattr(settings, 'LEAFLET_CONFIG', {}).get('SPATIAL_EXTENT'),
            styles=_MAP_STYLES,
        )

        # URLs
        root_url = app_settings['ROOT_URL']
        root_url = root_url if root_url.endswith('/') else root_url + '/'
        dictsettings['urls'] = {}
        dictsettings['urls']['root'] = root_url

        class ModelName:
            pass

        dictsettings['urls']['static'] = settings.STATIC_URL
        dictsettings['urls']['layer'] = root_url + urlizor.url_layer(ModelName)[1:-1]
        dictsettings['urls']['detail'] = root_url + 'modelname/0/'
        dictsettings['urls']['format_list'] = root_url + urlizor.url_format_list(ModelName)[1:-1]
        dictsettings['urls']['screenshot'] = reverse("mapentity:map_screenshot")

        # Useful for JS calendars
        dictsettings['date_format'] = settings.DATE_INPUT_FORMATS[0].replace('%Y', 'yyyy').replace('%m', 'mm').replace('%d', 'dd')
        # Languages
        dictsettings['languages'] = dict(available=dict(app_settings['TRANSLATED_LANGUAGES']),
                                         default=app_settings['LANGUAGE_CODE'])
        return dictsettings


@csrf_exempt
@login_required
def map_screenshot(request):
    """
    This view allows to take screenshots, via a django-screamshot service, of
    the map **currently viewed by the user**.

    - A context full of information is built on client-side and posted here.
    - We reproduce this context, via headless browser, and take a capture
    - We return the resulting image as attachment.

    This seems overkill ? Please look around and find a better way.
    """
    try:
        printcontext = request.POST['printcontext']
        assert len(printcontext) < 512, "Print context is way too big."

        # Prepare context, extract and add infos
        context = json.loads(printcontext)
        selector = context.pop('selector')
        map_url = context.pop('url')
        map_url = request.build_absolute_uri(map_url)
        context['print'] = True
        printcontext = json.dumps(context)
        contextencoded = urllib2.quote(printcontext)
        map_url += '?context=%s' % contextencoded
        logger.debug("Capture %s" % map_url)

        # Capture image and return it
        width = context.get('viewport', {}).get('width')
        height = context.get('viewport', {}).get('height')

        response = HttpResponse()
        capture_image(map_url, response, width=width, height=height, selector=selector)
        response['Content-Disposition'] = 'attachment; filename=%s.png' % datetime.now().strftime('%Y%m%d-%H%M%S')
        return response

    except Exception, e:
        logger.exception(e)
        return HttpResponseBadRequest(e)


@require_http_methods(["POST"])
@csrf_exempt
@login_required
def history_delete(request, path=None):
    path = request.POST.get('path', path)
    if path:
        history = request.session.get('history')
    if history:
        history = [h for h in history if h['path'] != path]
        request.session['history'] = history
    return HttpResponse()
