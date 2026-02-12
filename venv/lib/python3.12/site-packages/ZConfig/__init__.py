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
"""Structured, schema-driven configuration library.

ZConfig is a configuration library intended for general use.  It
supports a hierarchical schema-driven configuration model that allows
a schema to specify data conversion routines written in Python.
ZConfig's model is very different from the model supported by the
ConfigParser module found in Python's standard library, and is more
suitable to configuration-intensive applications.

ZConfig schema are written in an XML-based language and are able to
``import`` schema components provided by Python packages.  Since
components are able to bind to conversion functions provided by Python
code in the package (or elsewhere), configuration objects can be
arbitrarily complex, with values that have been verified against
arbitrary constraints.  This makes it easy for applications to
separate configuration support from configuration loading even with
configuration data being defined and consumed by a wide range of
separate packages.

"""
__docformat__ = "reStructuredText"

from io import StringIO

import ZConfig.loader


loadConfigFile = ZConfig.loader.loadConfigFile
loadSchemaFile = ZConfig.loader.loadSchemaFile
loadConfig = ZConfig.loader.loadConfig
loadSchema = ZConfig.loader.loadSchema


version_info = (3, 0)
__version__ = ".".join([str(n) for n in version_info])


class ConfigurationError(Exception):
    """Base class for exceptions specific to the :mod:`ZConfig` package.

    All instances provide a ``message`` attribute that describes
    the specific error, and a ``url`` attribute that gives the URL
    of the resource the error was located in, or ``None``.

    """

    # The 'message' attribute was deprecated for BaseException with
    # Python 2.6; here we create descriptor properties to continue using it
    def __set_message(self, v):
        self.__dict__['message'] = v

    def __get_message(self):
        return self.__dict__['message']

    def __del_message(self):
        del self.__dict__['message']

    message = property(__get_message, __set_message, __del_message)

    def __init__(self, msg, url=None):
        self.message = msg
        self.url = url
        Exception.__init__(self, msg)

    def __str__(self):
        return self.message


class _ParseError(ConfigurationError):
    def __init__(self, msg, url, lineno, colno=None):
        self.lineno = lineno
        self.colno = colno
        ConfigurationError.__init__(self, msg, url)

    def __str__(self):
        s = self.message
        if self.url:
            s += "\n("
        elif (self.lineno, self.colno) != (None, None):
            s += " ("
        if self.lineno:
            s += "line %d" % self.lineno
            if self.colno is not None:
                s += ", column %d" % self.colno
            if self.url:
                s += " in %s)" % self.url
            else:
                s += ")"
        elif self.url:
            s += self.url + ")"
        return s


class SchemaError(_ParseError):
    """Raised when a schema contains an error.

    This exception type provides the attributes ``url``, ``lineno``,
    and ``colno``, which provide the source URL, the line number, and
    the column number at which the error was detected. These attributes
    may be ``None`` in some cases.
    """

    def __init__(self, msg, url=None, lineno=None, colno=None):
        _ParseError.__init__(self, msg, url, lineno, colno)


class UnknownDocumentTypeError(SchemaError):
    """
    Raised when the root element of the document being parsed is
    unexpected.
    """


class SchemaResourceError(SchemaError):
    """Raised when there's an error locating a resource required by the
    schema.

    Instances of this exception class add the attributes ``filename``,
    ``package``, and ``path``, which hold the filename searched for
    within the package being loaded, the name of the package, and the
    ``__path__`` attribute of the package itself (or ``None`` if it
    isn't a package or could not be imported).
    """

    def __init__(self, msg, url=None, lineno=None, colno=None,
                 path=None, package=None, filename=None):
        self.filename = filename
        self.package = package
        if path is not None:
            path = path[:]
        self.path = path
        SchemaError.__init__(self, msg, url, lineno, colno)

    def __str__(self):
        s = SchemaError.__str__(self)
        if self.package is not None:
            s += "\n  Package name: " + repr(self.package)
        if self.filename is not None:
            s += "\n  File name: " + repr(self.filename)
        if self.package is not None:
            s += "\n  Package path: " + repr(self.path)
        return s


class ConfigurationSyntaxError(_ParseError):
    """Exception raised when a configuration source does not conform to
    the allowed syntax.

    In addition to the ``message`` and ``url`` attributes, exceptions
    of this type offer the ``lineno`` attribute, which provides the
    line number at which the error was detected.
    """


class DataConversionError(ConfigurationError, ValueError):
    """Raised when a data type conversion fails with :exc:`ValueError`.

    This exception is a subclass of both :exc:`ConfigurationError` and
    :exc:`ValueError`. The :func:`str` of the exception provides the
    explanation from the original :exc:`ValueError`, and the line
    number and URL of the value which provoked the error. The
    following additional attributes are provided:

    ``colno``
       column number at which the value starts, or ``None``
    ``exception``
       the original :exc:`ValueError` instance
    ``lineno``
       line number on which the value starts
    ``message``
      :func:`str` returned by the original :exc:`ValueError`
    ``value``
        original value passed to the conversion function
    ``url``
        URL of the resource providing the value text
    """

    def __init__(self, exception, value, position):
        ConfigurationError.__init__(self, str(exception))
        self.exception = exception
        self.value = value
        self.lineno, self.colno, self.url = position

    def __str__(self):
        s = f"{self.message} (line {self.lineno}"
        if self.colno is not None:
            s += ", %s" % self.colno
        if self.url:
            s += ", in %s)" % self.url
        else:
            s += ")"
        return s


class SubstitutionSyntaxError(ConfigurationError):
    """Raised when interpolation source text contains syntactical errors."""


class SubstitutionReplacementError(ConfigurationSyntaxError, LookupError):
    """Raised when the source text contains references to names which are
    not defined in *mapping*.

    The attributes ``source`` and ``name`` provide the complete source
    text and the name (converted to lower case) for which no replacement
    is defined.
    """

    def __init__(self, source, name, url=None, lineno=None):
        self.source = source
        self.name = name
        ConfigurationSyntaxError.__init__(
            self, "no replacement for " + repr(name), url, lineno)


def configureLoggers(text):
    """Configure one or more loggers from configuration text."""

    schema = ZConfig.loader.loadSchemaFile(StringIO("""
    <schema>
    <import package='ZConfig.components.logger'/>
    <multisection type='logger' name='*' attribute='loggers'/>
    </schema>
    """))

    config, _ = ZConfig.loader.loadConfigFile(schema, StringIO(text))
    for factory in config.loggers:
        factory()
