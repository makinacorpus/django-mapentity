import json
import logging
import math
import string
import time
from mimetypes import types_map
from urllib.parse import quote, urljoin

import bs4
import requests
from django.conf import settings
from django.contrib.gis.gdal.error import GDALException
from django.contrib.gis.geos import GEOSException, fromstr
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.files.uploadedfile import SimpleUploadedFile
from django.template.exceptions import TemplateDoesNotExist
from django.template.loader import get_template
from django.urls import resolve
from django.utils.translation import get_language

from .settings import API_SRID, app_settings
from .tokens import TokenManager

logger = logging.getLogger(__name__)


def api_bbox(bbox, srid=None, buffer=0.0):
    """Receives a tuple(xmin, ymin, xmax, ymax) and
    returns a tuple in API projection.

    :srid: bbox projection (Default: settings.SRID)
    :buffer: grow the bbox in ratio of width (Default: 0.0)
    """
    srid = srid or settings.SRID
    wkt_box = "POLYGON(({0} {1}, {2} {1}, {2} {3}, {0} {3}, {0} {1}))"
    wkt = wkt_box.format(*bbox)
    native = wkt_to_geom(wkt, srid_from=srid)
    if srid != API_SRID:
        native.transform(API_SRID)
    if buffer > 0:
        extent = native.extent
        width = extent[2] - extent[0]
        native = native.buffer(width * buffer)
    return tuple(native.extent)


def wkt_to_geom(wkt, srid_from=None, silent=False):
    if srid_from is None:
        srid_from = API_SRID
    try:
        return fromstr(wkt, srid=srid_from)
    except (GDALException, GEOSException) as e:
        if not silent:
            raise e
        return None


def smart_urljoin(base, path):
    if base[-1] != "/":
        base += "/"
    if path[0] == "/":
        path = path[1:]
    return urljoin(base, path)


def is_file_uptodate(path, date_update, delete_empty=True):
    if not default_storage.exists(path):
        return False

    if date_update is None:
        return False

    if default_storage.size(path) == 0:
        if delete_empty:
            default_storage.delete(path)
        return False

    modified = default_storage.get_modified_time(path)
    return modified > date_update


def get_source(url, headers):
    msg = f"Request to: {url}"
    logger.info(msg)
    source = requests.get(url, headers=headers)
    status_error = f"Request on {url} failed (status={source.status_code})"
    assert source.status_code == 200, status_error

    content_error = f"Request on {url} returned empty content"
    assert len(source.content) > 0, content_error

    return source.content


def download_content(url, silent=False, headers=None):
    """Download URL and return content."""
    source = None
    try:
        try:
            source = get_source(url, headers)
        except requests.exceptions.ConnectionError:
            time.sleep(1)
            source = get_source(url, headers)
    except (AssertionError, requests.exceptions.RequestException) as e:
        logger.exception(e)
        msg = f"Headers sent: {headers}"
        logger.info(msg)
        if hasattr(source, "text"):
            msg = f"Response: {source.text[:150]}"
            logger.info(msg)

        if not silent:
            raise e

    return source


def convertit_url(url, from_type=None, to_type=None, proxy=False):
    if not to_type:
        to_type = "application/pdf"
    mimetype = to_type
    if "/" not in mimetype:
        extension = "." + mimetype if not mimetype.startswith(".") else mimetype
        mimetype = types_map[extension]

    fromparam = (f"&from={quote(from_type)}") if from_type is not None else ""
    params = f"url={quote(url)}{fromparam}&to={quote(mimetype)}"
    url = "{server}/?{params}".format(
        server=app_settings["CONVERSION_SERVER"], params=params
    )
    return url


def convertit_download(url, from_type=None, to_type="application/pdf", headers=None):
    url = convertit_url(url, from_type, to_type)
    return download_content(url, headers=headers)


def capture_url(url, width=None, height=None, selector=None, waitfor=None):
    """Return URL to request a capture from Screamshotter"""
    server = app_settings["CAPTURE_SERVER"]
    width = (f"&width={width}") if width else ""
    height = (f"&height={height}") if height else ""
    selector = (f"&selector={quote(selector)}") if selector else ""
    waitfor = (f"&waitfor={quote(waitfor)}") if waitfor else ""
    params = f"{width}{height}{selector}{waitfor}"
    final_url = f"{server}/?url={quote(url)}{params}"
    return final_url


def capture_image(url, **kwargs):
    """Capture url to stream."""
    url = capture_url(url, **kwargs)
    return download_content(url)


def capture_map_image(
    url,
    destination,
    size=None,
    aspect=1.0,
    waitfor=".leaflet-tile-loaded",
    printcontext=None,
):
    """Prepare aspect of the detail page

    It relies on JS code in MapEntity.Context
    """
    # Control aspect of captured images
    if size is None:
        size = app_settings["MAP_CAPTURE_SIZE"]
    if aspect < 1.0:
        mapsize = dict(width=size * aspect, height=size)
    else:
        mapsize = dict(width=size, height=size / aspect)
    _printcontext = dict(mapsize=mapsize)
    _printcontext["print"] = True
    if printcontext:
        _printcontext.update(printcontext)
    serialized = json.dumps(_printcontext)
    # Run head-less capture (takes time)
    auth_token = TokenManager.generate_token()
    url += f"?lang={get_language()}&auth_token={auth_token}&context={quote(serialized)}"
    map_image = capture_image(url, selector=".map-panel", waitfor=waitfor)
    if default_storage.exists(destination):
        default_storage.delete(destination)
    default_storage.save(destination, ContentFile(map_image))


def extract_attributes_html(url, request):
    """
    The tidy XHTML version of objects attributes.

    Since we have to insert them in document exports, we extract the
    ``details-panel`` of the detail page, using BeautifulSoup.
    With this, we save a lot of efforts, since we do have to build specific Appy.pod
    templates for each model.
    """
    func, args, kwargs = resolve(url)
    response = func(request, *args, **kwargs)
    response.render()

    soup = bs4.BeautifulSoup(response.content, features="html.parser")
    details = soup.find(id="properties")
    if details is None:
        msg = "Content is of detail page is invalid"
        raise ValueError(msg)

    # Remove "Add" buttons
    for p in details("p"):
        if "autohide" in p.get("class", ""):
            p.extract()
    # Remove Javascript
    for s in details("script"):
        s.extract()
    # Remove images (Appy.pod fails with them)
    for i in details("img"):
        i.replaceWith(i.get("title", ""))
    # Remove links (Appy.pod sometimes shows empty strings)
    for a in details("a"):
        a.replaceWith(a.text)
    # Prettify (ODT compat.) and convert unicode to XML entities
    cooked = details.prettify("ascii", formatter="html").decode()
    return cooked


def user_has_perm(user, perm):
    # First check if the user has the permission (even anon user)
    if user.has_perm(perm):
        return True
    if user.is_anonymous:
        return perm in app_settings["ANONYMOUS_VIEWS_PERMS"]
    return False


def alphabet_enumeration(length):
    """
    Return list of letters : A, B, ... Z, AA, AB, ...
    See mapentity/leaflet.enumeration.js
    """
    if length == 0:
        return []
    if length == 1:
        return ["A"]
    width = int(math.ceil(math.log(length, 26)))
    enums = []
    alphabet = string.ascii_uppercase
    for i in range(length):
        enum = ""
        for j in range(width):
            enum = alphabet[i % 26] + enum
            i = i // 26
        enums.append(enum)
    return enums


def suffix_for(template_name_suffix, template_type, extension):
    return f"{template_name_suffix}{template_type}.{extension}"


def name_for(app, modelname, suffix):
    return f"{app}/{modelname}{suffix}"


def smart_get_template(model, suffix):
    for appname, modelname in [
        (model._meta.app_label, model._meta.object_name.lower()),
        ("mapentity", "override"),
        ("mapentity", "mapentity"),
    ]:
        try:
            template_name = name_for(appname, modelname, suffix)
            get_template(template_name)  # Will raise if not exist
            return template_name
        except TemplateDoesNotExist:
            pass
    return None


def clone_attachment(attachment, field_file, attrs=None):
    if attrs is None:
        attrs = {}
    fields = attachment._meta.get_fields()
    clone_values = {}
    for field in fields:
        if not field.auto_created:
            if field.name in attrs.keys():
                if callable(attrs.get(field.name)):
                    clone_values[field.name] = attrs.get(field.name)(
                        getattr(attachment, field.name)
                    )
                else:
                    clone_values[field.name] = attrs.get(field.name)
            elif field.name == field_file:
                attachment_content = getattr(attachment, field_file).read()
                attachment_name = getattr(attachment, field_file).name.split("/")[-1]
                clone_values[field_file] = SimpleUploadedFile(
                    attachment_name, attachment_content
                )
            else:
                clone_values[field.name] = getattr(attachment, field.name, None)
    attachment._meta.model.objects.create(**clone_values)
