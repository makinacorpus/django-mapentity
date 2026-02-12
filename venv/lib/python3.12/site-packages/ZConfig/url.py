##############################################################################
#
# Copyright (c) 2002, 2003, 2018 Zope Foundation and Contributors.
# All Rights Reserved.
#
# This software is subject to the provisions of the Zope Public License,
# Version 2.1 (ZPL).  A copy of the ZPL should accompany this distribution.
# THIS SOFTWARE IS PROVIDED "AS IS" AND ANY AND ALL EXPRESS OR IMPLIED
# WARRANTIES ARE DISCLAIMED, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
# WARRANTIES OF TITLE, MERCHANTABILITY, AGAINST INFRINGEMENT, AND FITNESS
# FOR A PARTICULAR PURPOSE.
#
##############################################################################
"""urlparse-like helpers that normalize file: URLs.

ZConfig and urllib2 expect file: URLs to consistently use the '//'
hostpart separator; the functions here enforce this constraint.

"""

import urllib.parse
import urllib.request


def urlnormalize(url):
    lc = url.lower()
    if lc.startswith("file:/") and not lc.startswith("file:///"):
        url = "file://" + url[5:]
    return url


def urlunsplit(parts):
    parts = list(parts)
    parts.insert(3, '')
    url = urllib.request.urlunparse(tuple(parts))
    if (parts[0] == "file"
            and url.startswith("file:/")
            and not url.startswith("file:///")):
        # It may not be possible to get here anymore with
        # modern urlparse, at least not on posix?
        url = "file://" + url[5:]  # pragma: no cover
    return url


def urldefrag(url):
    url, fragment = urllib.parse.urldefrag(url)
    return urlnormalize(url), fragment


def urljoin(base, relurl):
    url = urllib.request.urljoin(base, relurl)
    if url.startswith("file:/") and not url.startswith("file:///"):
        # It may not be possible to get here anymore with
        # modern urlparse, at least not on posix?
        url = "file://" + url[5:]  # pragma: no cover
    return url
