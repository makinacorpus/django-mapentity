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
"""Default implementation of a data type registry

This module provides the implementation of the default data type
registry and all the standard data types supported by :mod:`ZConfig`.
A number of convenience classes are also provided to assist in the
creation of additional data types.

A "data type registry" is an object that provides conversion functions
for data types. The interface for a :class:`registry <Registry>` is
fairly simple.

A "conversion function" is any callable object that accepts a single
argument and returns a suitable value, or raises an exception if the
input value is not acceptable. :exc:`ValueError` is the preferred
exception for disallowed inputs, but any other exception will be
properly propagated.

"""

import datetime
import os
import re
import sys
from functools import reduce


class MemoizedConversion:
    """Simple memoization for potentially expensive conversions.

    This conversion helper caches each successful conversion for re-use
    at a later time; failed conversions are not cached in any way, since
    it is difficult to raise a meaningful exception providing
    information about the specific failure.

    """

    def __init__(self, conversion):
        self._memo = {}
        self._conversion = conversion

    def __call__(self, value):
        try:
            return self._memo[value]
        except KeyError:
            v = self._conversion(value)
            self._memo[value] = v
            return v


class RangeCheckedConversion:
    """Conversion helper that performs range checks on the result of
    another conversion.

    Values passed to instances of this conversion are converted using
    *conversion* and then range checked. *min* and *max*, if given and
    not ``None``, are the inclusive endpoints of the allowed range.
    Values returned by *conversion* which lay outside the range
    described by *min* and *max* cause :exc:`ValueError` to be raised.

    """

    def __init__(self, conversion, min=None, max=None):
        self._min = min
        self._max = max
        self._conversion = conversion

    def __call__(self, value):
        v = self._conversion(value)
        if self._min is not None and v < self._min:
            raise ValueError("%s is below lower bound (%s)"
                             % (repr(v), repr(self._min)))
        if self._max is not None and v > self._max:
            raise ValueError("%s is above upper bound (%s)"
                             % (repr(v), repr(self._max)))
        return v


class RegularExpressionConversion:
    """Conversion that checks that the input matches the regular
    expression *regex*.

    If it matches, returns the input, otherwise raises
    :exc:`ValueError`.
    """

    reason = "value did not match regular expression"

    def __init__(self, regex):
        self._rx = re.compile(regex)

    def __call__(self, value):
        m = self._rx.match(value)
        if m and m.group() == value:
            return value
        else:
            raise ValueError(f"{self.reason}: {repr(value)}")


def check_locale(value):
    import locale
    prev = locale.setlocale(locale.LC_ALL)
    try:
        try:
            locale.setlocale(locale.LC_ALL, value)
        finally:
            locale.setlocale(locale.LC_ALL, prev)
    except locale.Error:
        raise ValueError(
            'The specified locale "%s" is not supported by your system.\n'
            'See your operating system documentation for more\n'
            'information on locale support.' % value)
    else:
        return value


class BasicKeyConversion(RegularExpressionConversion):

    def __init__(self):
        RegularExpressionConversion.__init__(self, "[a-zA-Z][-._a-zA-Z0-9]*")

    def __call__(self, value):
        value = str(value)
        return RegularExpressionConversion.__call__(self, value).lower()


class ASCIIConversion(RegularExpressionConversion):
    pass


_ident_re = "[_a-zA-Z][_a-zA-Z0-9]*"


class IdentifierConversion(ASCIIConversion):
    reason = "not a valid Python identifier"

    def __init__(self):
        ASCIIConversion.__init__(self, _ident_re)


class DottedNameConversion(ASCIIConversion):
    reason = "not a valid dotted name"

    def __init__(self):
        ASCIIConversion.__init__(self,
                                 fr"{_ident_re}(?:\.{_ident_re})*")


class DottedNameSuffixConversion(ASCIIConversion):
    reason = "not a valid dotted name or suffix"

    def __init__(self):
        ASCIIConversion.__init__(self,
                                 r"(?:%s)(?:\.%s)*|(?:\.%s)+"
                                 % (_ident_re, _ident_re, _ident_re))


def integer(value):
    return int(value)


def null_conversion(value):
    return value


def asBoolean(s):
    """Convert a string value to a boolean value."""
    ss = str(s).lower()
    if ss in ('yes', 'true', 'on'):
        return True
    elif ss in ('no', 'false', 'off'):
        return False
    else:
        raise ValueError("not a valid boolean value: " + repr(s))


def string_list(s):
    """Convert a string to a list of strings using .split()."""
    return s.split()


port_number = RangeCheckedConversion(integer, min=0, max=0xffff).__call__


class InetAddress:

    def __init__(self, default_host):
        self.DEFAULT_HOST = default_host

    def __call__(self, s):
        # returns (host, port) tuple
        host = ''
        port = None
        if ":" in s:
            host, p = s.rsplit(":", 1)
            if host.startswith('[') and host.endswith(']'):
                # [IPv6]:port
                host = host[1:-1]
            elif ':' in host:
                # Unbracketed IPv6 address;
                # last part is not the port number
                host = s
                p = None
            if p:  # else leave port at None
                port = port_number(p)
            host = host.lower()
        else:
            try:
                port = port_number(s)
            except ValueError:
                if len(s.split()) != 1:
                    raise ValueError("not a valid host name: " + repr(s))
                host = s.lower()
        if not host:
            host = self.DEFAULT_HOST
        return host, port


if sys.platform[:3] == "win":
    DEFAULT_HOST = "localhost"
else:
    DEFAULT_HOST = ""

inet_address = InetAddress(DEFAULT_HOST)
inet_connection_address = InetAddress("127.0.0.1")
inet_binding_address = InetAddress(DEFAULT_HOST)


class SocketAddress:
    # Parsing results in family and address
    # Family can be AF_UNIX (for addresses that are path names)
    # or AF_INET6 (for inet addresses with colons in them)
    # or AF_INET (for all other inet addresses);
    # An inet address is a (host, port) pair
    # Notice that no DNS lookup is performed, so if the host
    # is a DNS name, DNS lookup may end up with either IPv4 or
    # IPv6 addresses, or both

    def __init__(self, s):
        import socket
        if "/" in s or s.find(os.sep) >= 0:
            self.family = getattr(socket, "AF_UNIX", None)
            self.address = s
        else:
            self.family = socket.AF_INET
            self.address = self._parse_address(s)
            if ':' in self.address[0]:
                self.family = socket.AF_INET6

    def _parse_address(self, s):
        return inet_address(s)


class SocketBindingAddress(SocketAddress):

    def _parse_address(self, s):
        return inet_binding_address(s)


class SocketConnectionAddress(SocketAddress):

    def _parse_address(self, s):
        return inet_connection_address(s)


def float_conversion(v):
    return float(v)


class IpaddrOrHostname(RegularExpressionConversion):
    def __init__(self):
        # IP address regex from the Perl Cookbook, Recipe 6.23 (revised ed.)
        # We allow underscores in hostnames although this is considered
        # illegal according to RFC1034.
        # Addition: IPv6 addresses are now also accepted
        expr = (r"(^(\d|[01]?\d\d|2[0-4]\d|25[0-5])\."  # ipaddr
                r"(\d|[01]?\d\d|2[0-4]\d|25[0-5])\."    # ipaddr cont'd
                r"(\d|[01]?\d\d|2[0-4]\d|25[0-5])\."    # ipaddr cont'd
                r"(\d|[01]?\d\d|2[0-4]\d|25[0-5])$)"    # ipaddr cont'd
                r"|([A-Za-z_][-A-Za-z0-9_.]*[-A-Za-z0-9_])"  # or hostname
                # or superset of IPv6 addresses (requiring at least one colon)
                r"|([0-9A-Fa-f:.]+:[0-9A-Fa-f:.]*)"
                )
        RegularExpressionConversion.__init__(self, expr)

    def __call__(self, value):
        result = RegularExpressionConversion.__call__(self, value).lower()
        # Use C library to validate IPv6 addresses, in particular wrt.
        # number of colons and number of digits per group
        if ':' in result:
            import socket
            try:
                socket.inet_pton(socket.AF_INET6, result)
            except OSError:
                raise ValueError('%r is not a valid IPv6 address' % value)
        return result


def existing_directory(v):
    nv = os.path.expanduser(v)
    if os.path.isdir(nv):
        return nv
    raise ValueError('%s is not an existing directory' % v)


def existing_path(v):
    nv = os.path.expanduser(v)
    if os.path.exists(nv):
        return nv
    raise ValueError('%s is not an existing path' % v)


def existing_file(v):
    nv = os.path.expanduser(v)
    if os.path.exists(nv):
        return nv
    raise ValueError('%s is not an existing file' % v)


def existing_dirpath(v):
    nv = os.path.expanduser(v)
    dirname = os.path.dirname(nv)
    if not dirname:
        # relative pathname with no directory component
        return nv
    if os.path.isdir(dirname):
        return nv
    raise ValueError('The directory named as part of the path %s '
                     'does not exist.' % v)


class SuffixMultiplier:
    # d is a dictionary of suffixes to integer multipliers.  If no suffixes
    # match, default is the multiplier.  Matches are case insensitive.  Return
    # values are in the fundamental unit.
    def __init__(self, d, default=1):
        self._d = d
        self._default = default
        # all keys must be the same size

        def check(a, b):
            if len(a) != len(b):
                raise ValueError("suffix length mismatch")
            return a

        self._keysz = len(reduce(check, d))

    def __call__(self, v):
        v = v.lower()
        for s, m in self._d.items():
            if v[-self._keysz:] == s:
                return int(v[:-self._keysz]) * m
        return int(v) * self._default


def timedelta(s):
    # Unlike the standard time-interval data type, which returns a float
    # number of seconds, this datatype takes a wider range of syntax and
    # returns a datetime.timedelta
    #
    # Accepts suffixes:
    #    w - weeks
    #    d - days
    #    h - hours
    #    m - minutes
    #    s - seconds
    #
    # and all arguments may be integers or floats, positive or negative.
    # More than one time interval suffix value may appear on the line, but
    # they should all be separated by spaces, e.g.:
    #
    # sleep_time 4w 2d 7h 12m 0.00001s
    weeks = days = hours = minutes = seconds = 0
    for part in s.split():
        val = float(part[:-1])
        suffix = part[-1]
        if suffix == 'w':
            weeks = val
        elif suffix == 'd':
            days = val
        elif suffix == 'h':
            hours = val
        elif suffix == 'm':
            minutes = val
        elif suffix == 's':
            seconds = val
        else:
            raise TypeError(f'bad part {part} in {s}')
    return datetime.timedelta(weeks=weeks, days=days, hours=hours,
                              minutes=minutes, seconds=seconds)


stock_datatypes = {
    "boolean": asBoolean,
    "dotted-name": DottedNameConversion(),
    "dotted-suffix": DottedNameSuffixConversion(),
    "identifier": IdentifierConversion(),
    "integer": integer,
    "float": float_conversion,
    "string": str,
    "string-list": string_list,
    "null": null_conversion,
    "locale": MemoizedConversion(check_locale),
    "port-number": port_number,
    "basic-key": BasicKeyConversion(),
    "inet-address": inet_address,
    "inet-binding-address": inet_binding_address,
    "inet-connection-address": inet_connection_address,
    "socket-address": SocketAddress,
    "socket-binding-address": SocketBindingAddress,
    "socket-connection-address": SocketConnectionAddress,
    "ipaddr-or-hostname": IpaddrOrHostname(),
    "existing-directory": existing_directory,
    "existing-path": existing_path,
    "existing-file": existing_file,
    "existing-dirpath": existing_dirpath,
    "byte-size": SuffixMultiplier({'kb': 1024,
                                   'mb': 1024 * 1024,
                                   'gb': 1024 * 1024 * 1024,
                                   }),
    "time-interval": SuffixMultiplier({'s': 1,
                                       'm': 60,
                                       'h': 60 * 60,
                                       'd': 60 * 60 * 24,
                                       }),
    "timedelta": timedelta,
}


class Registry:
    """Implementation of a simple type registry.

    If given, *stock* should be a mapping which defines the "built-in"
    data types for the registry; if omitted or ``None``, the standard
    set of data types is used (see :ref:`standard-datatypes`).

    """

    def __init__(self, stock=None):
        if stock is None:
            stock = stock_datatypes.copy()
        self._stock = stock
        self._other = {}
        self._basic_key = None

    def find_name(self, conversion):
        """Return the best name for *conversion*, which must have been returned
        from *get* on this object."""
        for dct in self._other, self._stock:
            for k, v in dct.items():
                if v is conversion:
                    return k

        # If they followed the rules, we shouldn't get here.
        return str(conversion)  # pragma: no cover

    def get(self, name):
        """Return the type conversion routine for *name*.

        If the conversion function cannot be found, an (unspecified)
        exception is raised. If the name is not provided in the stock
        set of data types by this registry and has not otherwise been
        registered, this method uses the :meth:`search` method to load
        the conversion function. This is the only method the rest of
        :mod:`ZConfig` requires.

        """
        if '.' not in name:
            if self._basic_key is None:
                self._basic_key = self._other.get("basic-key")
                if self._basic_key is None:
                    self._basic_key = self._stock.get("basic-key")
                if self._basic_key is None:
                    self._basic_key = stock_datatypes["basic-key"]
            name = self._basic_key(name)
        t = self._stock.get(name)
        if t is None:
            t = self._other.get(name)
            if t is None:
                t = self.search(name)
        return t

    def register(self, name, conversion):
        """Register the data type name *name* to use the conversion function
        *conversion*.

        If *name* is already registered or provided as a stock data
        type, :exc:`ValueError` is raised (this includes the case when
        *name* was found using the :meth:`search` method).

        """
        if name in self._stock:
            raise ValueError("datatype name conflicts with built-in type: "
                             + repr(name))
        if name in self._other:
            raise ValueError("datatype name already registered: " + repr(name))
        self._other[name] = conversion

    def search(self, name):
        """This is a helper method for the default implementation of the
        :meth:`get` method.

        If *name* is a Python dotted-name, this method loads the value
        for the name by dynamically importing the containing module
        and extracting the value of the name. The name must refer to a
        usable conversion function.

        """
        if "." not in name:
            raise ValueError("unloadable datatype name: " + repr(name))
        components = name.split('.')
        start = components[0]
        g = {}
        package = __import__(start, g, g)
        modulenames = [start]
        for component in components[1:]:
            modulenames.append(component)
            try:
                package = getattr(package, component)
            except AttributeError:
                n = '.'.join(modulenames)
                package = __import__(n, g, g, component)
        self._other[name] = package
        return package
