import os
import urllib2
from urlparse import urljoin
import itertools
import logging
import urllib
from mimetypes import types_map
from datetime import datetime
import json

from django.utils import timezone
from django.conf import settings
from django.contrib.gis.gdal.error import OGRException
from django.contrib.gis.geos import GEOSException, fromstr
from django.http import HttpResponse

import bs4
import requests

from .settings import app_settings, API_SRID

logger = logging.getLogger(__name__)


def bbox_split(bbox, by_x=2, by_y=2, cycle=False):
    """Divide a box in rectangle, by_x parts and by_y parts"""
    minx, miny, maxx, maxy = bbox

    stepx = (maxx - minx) / by_x
    stepy = (maxy - miny) / by_y

    def gen():
        """define as inner function to decorate it with cycle"""
        stepx_tmp = minx
        while stepx_tmp + stepx <= maxx:
            stepx_next = stepx_tmp + stepx

            stepy_tmp = miny
            while stepy_tmp + stepy <= maxy:
                stepy_next = stepy_tmp + stepy
                yield (stepx_tmp, stepy_tmp, stepx_next, stepy_next)

                stepy_tmp = stepy_next

            stepx_tmp = stepx_next

    if cycle:
        return itertools.cycle(gen())
    else:
        return gen()


def bbox_split_srid_2154(*args, **kwargs):
    """Just round"""
    gen = bbox_split(*args, **kwargs)
    return iter(lambda: map(round, gen.next()), None)


def api_bbox(bbox, srid=None, buffer=0.0):
    """ Receives a tuple(xmin, ymin, xmax, ymax) and
    returns a tuple in API projection.

    :srid: bbox projection (Default: settings.SRID)
    :buffer: grow the bbox in ratio of width (Default: 0.0)
    """
    srid = srid or settings.SRID
    wkt_box = 'POLYGON(({0} {1}, {2} {1}, {2} {3}, {0} {3}, {0} {1}))'
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
    except (OGRException, GEOSException) as e:
        if not silent:
            raise e
        return None


def transform_wkt(wkt, srid_from=None, srid_to=None, dim=3):
    """
    Changes SRID, and returns 3D wkt
    """
    if srid_from is None:
        srid_from = API_SRID
    if srid_to is None:
        srid_to = settings.SRID
    try:
        geom = fromstr(wkt, srid=srid_from)
        if srid_from != srid_to:
            geom.transform(srid_to)
        extracoords = ' 0.0' * (dim - 2)  # add missing dimensions
        wkt3d = geom.wkt.replace(',', extracoords + ',')
        wkt3d = wkt3d.replace(')', extracoords + ')')
        return 'SRID=%s;%s' % (srid_to, wkt3d)
    except (OGRException, GEOSException, TypeError, ValueError), e:
        if settings.DEBUG or not getattr(settings, 'TEST', False):
            logger.error("wkt_to_geom('%s', %s, %s) : %s" % (wkt, srid_from, srid_to, e))
        return None


def smart_urljoin(base, path):
    if base[-1] != '/':
        base += '/'
    if path[0] == '/':
        path = path[1:]
    return urljoin(base, path)


def is_file_newer(path, date_update, delete_empty=True):
    if not os.path.exists(path):
        return False

    if date_update is None:
        return False

    if os.path.getsize(path) == 0:
        if delete_empty:
            os.remove(path)
        return False

    modified = datetime.fromtimestamp(os.path.getmtime(path))
    modified = modified.replace(tzinfo=timezone.utc)
    return modified > date_update


def download_to_stream(url, stream, silent=False, headers=None):
    """ Download url and writes response to stream.
    """
    try:
        source = None
        logger.info("Request to: %s" % url)
        source = requests.get(url, headers=headers)
        assert source.status_code == 200, 'Request failed (status=%s)' % source.status_code
        assert len(source.content) > 0, 'Request returned empty content'
    except (AssertionError, requests.exceptions.RequestException) as e:
        logger.exception(e)
        if hasattr(source, 'content'):
            logger.error(source.content[:150])
        if not silent:
            raise

    if source is None:
        return source

    try:
        stream.write(source.content)
        stream.flush()
    except IOError as e:
        logger.exception(e)
        if not silent:
            raise

    if isinstance(stream, HttpResponse):
        stream.status = source.status_code
        # Copy headers
        for header, value in source.headers.items():
            stream[header] = value

    return source


def convertit_url(url, from_type=None, to_type=None, proxy=False):
    if not to_type:
        to_type = 'application/pdf'
    mimetype = to_type
    if '/' not in mimetype:
        extension = '.' + mimetype if not mimetype.startswith('.') else mimetype
        mimetype = types_map[extension]

    fromparam = ("&from=%s" % urllib.quote(from_type)) if from_type is not None else ''
    params = 'url={url}{fromparam}&to={to}'.format(url=urllib.quote(url),
                                                   fromparam=fromparam,
                                                   to=urllib.quote(mimetype))
    url = '{server}/?{params}'.format(server=app_settings['CONVERSION_SERVER'],
                                      params=params)
    return url


def convertit_download(url, destination, from_type=None, to_type='application/pdf'):
    # Mock for tests
    if getattr(settings, 'TEST', False):
        open(destination, 'wb').write("Mock\n")
        return

    url = convertit_url(url, from_type, to_type)
    fd = open(destination, 'wb') if isinstance(destination, basestring) else destination
    download_to_stream(url, fd)


def capture_url(url, width=None, height=None, selector=None, waitfor=None):
    """Return URL to request a capture from Screamshotter
    """
    server = app_settings['CAPTURE_SERVER']
    width = ('&width=%s' % width) if width else ''
    height = ('&height=%s' % height) if height else ''
    selector = ('&selector=%s' % urllib.quote(selector)) if selector else ''
    waitfor = ('&waitfor=%s' % urllib.quote(waitfor)) if waitfor else ''
    params = '{width}{height}{selector}{waitfor}'.format(width=width,
                                                         height=height,
                                                         selector=selector,
                                                         waitfor=waitfor)
    capture_url = '{server}/?url={url}{params}'.format(server=server,
                                                       url=urllib.quote(url),
                                                       params=params)
    return capture_url


def capture_image(url, stream, **kwargs):
    """Capture url to stream.
    """
    url = capture_url(url, **kwargs)
    download_to_stream(url, stream)


def capture_map_image(url, destination, size=None, aspect=1.0):
    """Prepare aspect of the detail page

    It relies on JS code in MapEntity.Context
    """
    # Control aspect of captured images
    if size is None:
        size = app_settings['MAP_CAPTURE_SIZE']
    if aspect < 1.0:
        mapsize = dict(width=size * aspect, height=size)
    else:
        mapsize = dict(width=size, height=size / aspect)
    printcontext = dict(mapsize=mapsize)
    printcontext['print'] = True
    serialized = json.dumps(printcontext)
    # Run head-less capture (takes time)
    url += '?context=' + urllib2.quote(serialized)

    with open(destination, 'wb') as fd:
        capture_image(url, fd,
                      selector='.map-panel',
                      waitfor='.leaflet-tile-loaded')


def extract_attributes_html(url):
    """
    The tidy XHTML version of objects attributes.

    Since we have to insert them in document exports, we extract the
    ``details-panel`` of the detail page, using BeautifulSoup.
    With this, we save a lot of efforts, since we do have to build specific Appy.pod
    templates for each model.
    """
    r = requests.get(url)
    if r.status_code != 200:
        raise ValueError('Could not reach %s' % url)

    soup = bs4.BeautifulSoup(r.content)
    details = soup.find(id="properties")
    if details is None:
        raise ValueError('Content is of detail page is invalid')

    # Remove "Add" buttons
    for p in details('p'):
        if 'autohide' in p.get('class', ''):
            p.extract()
    # Remove Javascript
    for s in details('script'):
        s.extract()
    # Remove images (Appy.pod fails with them)
    for i in details('img'):
        i.replaceWith(i.get('title', ''))
    # Remove links (Appy.pod sometimes shows empty strings)
    for a in details('a'):
        a.replaceWith(a.text)
    # Prettify (ODT compat.) and convert unicode to XML entities
    cooked = details.prettify('ascii', formatter='html')
    return cooked


def user_has_perm(user, perm):
    # First check if the user has the permission (even anon user)
    if user.has_perm(perm):
        return True
    if user.is_anonymous():
        return perm in app_settings['ANONYMOUS_VIEWS_PERMS']
    return False
