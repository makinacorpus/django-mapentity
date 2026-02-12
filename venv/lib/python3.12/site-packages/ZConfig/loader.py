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
"""Schema loader utility."""

import os.path
import pathlib
import re
import sys
import urllib.request
from abc import ABC
from abc import abstractmethod
from io import StringIO

import ZConfig
import ZConfig.cfgparser
import ZConfig.datatypes
import ZConfig.info
import ZConfig.matcher
import ZConfig.schema
import ZConfig.url


def loadSchema(url):
    """Load a schema definition from the URL *url*.

    *url* may be a URL, absolute pathname, or relative pathname.
    Fragment identifiers are not supported.

    The resulting schema object can be passed to :func:`loadConfig` or
    :func:`loadConfigFile`. The schema object may be used as many
    times as needed.

    .. seealso:: :class:`~.SchemaLoader`, :meth:`.BaseLoader.loadURL`
    """
    return SchemaLoader().loadURL(url)


def loadSchemaFile(file, url=None):
    """Load a schema definition from the open file object *file*.

    If *url* is given and not ``None``, it should be the URL of
    resource represented by *file*. If *url* is omitted or ``None``, a
    URL may be computed from the ``name`` attribute of *file*, if
    present. The resulting schema object can be passed to
    :func:`loadConfig` or :func:`loadConfigFile`. The schema object
    may be used as many times as needed.

    .. seealso:: :class:`~.SchemaLoader`, :meth:`.BaseLoader.loadFile`
    """
    return SchemaLoader().loadFile(file, url)


def loadConfig(schema, url, overrides=()):
    """Load and return a configuration from a URL or pathname given by
    *url*.

    *url* may be a URL, absolute pathname, or relative pathname.
    Fragment identifiers are not supported. *schema* is a reference to a
    schema loaded by :func:`loadSchema` or :func:`loadSchemaFile`.

    The return value is a tuple containing the configuration object and
    a composite handler that, when called with a name-to-handler
    mapping, calls all the handlers for the configuration.

    The optional *overrides* argument represents information derived
    from command-line arguments. If given, it must be either a
    sequence of value specifiers, or ``None``. A "value specifier" is
    a string of the form ``optionpath=value``, for example,
    ``some/path/to/key=value``.

    .. seealso::
       :meth:`.ExtendedConfigLoader.addOption`
            For information on the format of value specifiers.
       :class:`~.ConfigLoader`
            For information about loading configs.
       :meth:`.BaseLoader.loadURL`
            For information about the format of *url*
    """
    return _get_config_loader(schema, overrides).loadURL(url)


def loadConfigFile(schema, file, url=None, overrides=()):
    """Load and return a configuration from an opened file object.

    If *url* is omitted, one will be computed based on the ``name``
    attribute of *file*, if it exists. If no URL can be determined,
    all ``%include`` statements in the configuration must use absolute
    URLs. *schema* is a reference to a schema loaded by
    :func:`loadSchema` or :func:`loadSchemaFile`.

    The return value is a tuple containing the configuration object
    and a composite handler that, when called with a name-to-handler
    mapping, calls all the handlers for the configuration. The
    *overrides* argument is the same as for the :func:`loadConfig`
    function.

    .. seealso:: :class:`~.ConfigLoader`, :meth:`.BaseLoader.loadFile`,
       :meth:`.ExtendedConfigLoader.addOption`
    """
    return _get_config_loader(schema, overrides).loadFile(file, url)


def _get_config_loader(schema, overrides):
    if overrides:
        from ZConfig import cmdline
        loader = cmdline.ExtendedConfigLoader(schema)
        for opt in overrides:
            loader.addOption(opt)
    else:
        loader = ConfigLoader(schema)
    return loader


class BaseLoader(ABC):
    """Base class for loader objects.

    This should not be instantiated
    directly, as the :meth:`loadResource` method must be overridden
    for the instance to be used via the public API.
    """

    def __init__(self):
        pass

    def createResource(self, file, url):
        """Returns a resource object for an open file and URL, given as *file*
        and *url*, respectively.

        This may be overridden by a subclass if an alternate resource
        implementation is desired.
        """
        return Resource(file, url)

    def loadURL(self, url):
        """Open and load a resource specified by the URL *url*.

        This method uses the :meth:`loadResource` method to perform the
        actual load, and returns whatever that method returns.
        """
        url = self.normalizeURL(url)
        with self.openResource(url) as r:
            return self.loadResource(r)

    def loadFile(self, file, url=None):
        """Load from an open file object, *file*.

        If given and not ``None``, *url* should be the URL of the
        resource represented by *file*. If omitted or *None*, the
        ``name`` attribute of *file* is used to compute a ``file:``
        URL, if present.

        This method uses the :meth:`loadResource` method to perform the
        actual load, and returns whatever that method returns.
        """
        if not url:
            url = _url_from_file(file)
        with self.createResource(file, url) as r:
            return self.loadResource(r)

    # utilities

    @abstractmethod
    def loadResource(self, resource):
        """Abstract method.

        Subclasses of :class:`BaseLoader` must implement this method to
        actually load the resource and return the appropriate
        application-level object.
        """

    def openResource(self, url):
        """Returns a resource object that represents the URL *url*.

        The URL is opened using the :func:`urllib.request.urlopen` function,
        and the returned resource object is created using
        :meth:`createResource`. If the URL cannot be opened,
        :exc:`~.ConfigurationError` is raised.
        """
        # ConfigurationError exceptions raised here should be
        # str()able to generate a message for an end user.
        #
        # XXX This should be replaced to use a local cache for remote
        # resources.  The policy needs to support both re-retrieve on
        # change and provide the cached resource when the remote
        # resource is not accessible.
        url = str(url)
        if url.startswith("package:"):
            _, package, filename = url.split(":", 2)
            file = openPackageResource(package, filename)
        else:
            try:
                file = urllib.request.urlopen(url)
            except urllib.request.URLError as e:
                # urllib.request.URLError has a particularly hostile str(), so
                # we generally don't want to pass it along to the user.
                self._raise_open_error(url, e.reason)  # pragma: no cover
            except OSError as e:
                self._raise_open_error(url, str(e))

            try:
                data = file.read()
            finally:
                file.close()
            if isinstance(data, bytes):
                # Be sure to specify an (useful) encoding so we don't get
                # the system default, typically ascii.
                data = data.decode('utf-8')
            file = StringIO(data)
        return self.createResource(file, url)

    def _raise_open_error(self, url, message):
        if url[:7].lower() == "file://":
            what = "file"
            ident = urllib.request.url2pathname(url[7:])
        else:
            what = "URL"
            ident = url
        raise ZConfig.ConfigurationError(
            f"error opening {what} {ident}: {message}", url)

    def normalizeURL(self, url):
        """Return a URL for *url*

        If *url* refers to an existing file, the corresponding
        ``file:`` URL is returned. Otherwise *url* is checked
        for sanity: if it does not have a schema, :exc:`ValueError` is
        raised, and if it does have a fragment identifier,
        :exc:`~.ConfigurationError` is raised.

        This uses :meth:`isPath` to determine whether *url* is
        a URL of a filesystem path.
        """
        if self.isPath(url):
            url = pathlib.Path(os.path.abspath(url)).as_uri()
        newurl, fragment = ZConfig.url.urldefrag(url)
        if fragment:
            raise ZConfig.ConfigurationError(
                "fragment identifiers are not supported",
                url)
        return newurl

    # from RFC 3986:
    # schema = ALPHA *( ALPHA / DIGIT / "+" / "-" / "." )
    _pathsep_rx = re.compile(r"[a-zA-Z][-+.a-zA-Z0-9]*:")

    def isPath(self, s):
        """Return true if *s* should be considered a filesystem path rather
        than a URL.
        """
        if ":" in s:
            # XXX This assumes that one-character scheme identifiers
            # are always Windows drive letters; I don't know of any
            # one-character scheme identifiers.
            m = self._pathsep_rx.match(s)
            if m is None:
                return True
            # Does it look like a drive letter?
            return len(m.group(0)) == 2
        else:
            return True


def openPackageResource(package, path):
    __import__(package)
    pkg = sys.modules[package]
    try:
        loader = pkg.__loader__
    except AttributeError:
        relpath = os.path.join(*path.split("/"))
        for dirname in pkg.__path__:
            filename = os.path.join(dirname, relpath)
            if os.path.exists(filename):
                break
        else:
            raise ZConfig.SchemaResourceError("schema component not found",
                                              filename=path,
                                              package=package,
                                              path=pkg.__path__)
        url = pathlib.Path(filename).absolute().as_uri()
        url = ZConfig.url.urlnormalize(url)
        return urllib.parse.urlopen(url)
    else:
        v, tb = (None, None)
        for dirname in pkg.__path__:
            loadpath = os.path.join(dirname, path)
            try:
                return StringIO(
                    loader.get_data(loadpath).decode('utf-8'))
            except Exception as e:
                v = ZConfig.SchemaResourceError(
                    "error opening schema component: " + repr(e),
                    filename=path,
                    package=package,
                    path=pkg.__path__)
                tb = sys.exc_info()[2]

        if v is not None:
            try:
                raise v.with_traceback(tb)
            finally:
                del tb

        raise ZConfig.SchemaResourceError("schema component not found",
                                          filename=path,
                                          package=package,
                                          path=pkg.__path__)


def _url_from_file(file_or_path):
    name = getattr(file_or_path, "name", None)
    if name and name[0] != "<" and name[-1] != ">":
        return pathlib.Path(os.path.abspath(name)).as_uri()


class SchemaLoader(BaseLoader):
    """ Loader that loads schema instances.

    All schema loaded by a :class:`SchemaLoader` will use the same
    data type registry. If *registry* is provided and not ``None``, it
    will be used, otherwise an instance of
    :class:`ZConfig.datatypes.Registry` will be used.
    """

    def __init__(self, registry=None):
        if registry is None:
            registry = ZConfig.datatypes.Registry()
        BaseLoader.__init__(self)
        self.registry = registry
        self._cache = {}

    def loadResource(self, resource):
        if resource.url and resource.url in self._cache:
            schema = self._cache[resource.url]
        else:
            schema = ZConfig.schema.parseResource(resource, self)
            self._cache[resource.url] = schema
        return schema

    # schema parser support API

    def schemaComponentSource(self, package, filename):
        parts = package.split(".")
        if not parts:  # pragma: no cover
            raise ZConfig.SchemaError(
                "illegal schema component name: " + repr(package))
        if "" in parts:
            # '' somewhere in the package spec; still illegal
            raise ZConfig.SchemaError(
                "illegal schema component name: " + repr(package))
        filename = filename or "component.xml"
        try:
            __import__(package)
        except ImportError as e:
            raise ZConfig.SchemaResourceError(
                f"could not load package {package}: {str(e)}",
                filename=filename,
                package=package)
        pkg = sys.modules[package]
        if not hasattr(pkg, "__path__"):
            raise ZConfig.SchemaResourceError(
                "import name does not refer to a package",
                filename=filename, package=package)
        return f"package:{package}:{filename}"


class ConfigLoader(BaseLoader):
    """Loader for configuration files.

    Each configuration file must
    conform to the schema *schema*.  The ``load*()`` methods
    return a tuple consisting of the configuration object and a
    composite handler.

    """

    def __init__(self, schema):
        if schema.isabstract():
            raise ZConfig.SchemaError(
                "cannot check a configuration an abstract type")
        BaseLoader.__init__(self)
        self.schema = schema
        self._private_schema = False

    def loadResource(self, resource):
        sm = self.createSchemaMatcher()
        self._parse_resource(sm, resource)
        result = sm.finish(), CompositeHandler(sm.handlers, self.schema)
        return result

    def createSchemaMatcher(self):
        return ZConfig.matcher.SchemaMatcher(self.schema)

    # config parser support API

    def startSection(self, parent, type_, name):
        t = self.schema.gettype(type_)
        if t.isabstract():
            raise ZConfig.ConfigurationError(
                "concrete sections cannot match abstract section types;"
                " found abstract type " + repr(type_))
        return parent.createChildMatcher(t, name)

    def endSection(self, parent, type_, name, matcher):
        sectvalue = matcher.finish()
        parent.addSection(type_, name, sectvalue)

    def importSchemaComponent(self, pkgname):
        schema = self.schema
        if not self._private_schema:
            # replace the schema with an extended schema on the first %import
            self._loader = SchemaLoader(self.schema.registry)
            schema = ZConfig.info.createDerivedSchema(self.schema)
            self._private_schema = True
            self.schema = schema
        url = self._loader.schemaComponentSource(pkgname, '')
        if schema.hasComponent(url):
            return
        schema.addComponent(url)
        with self.openResource(url) as resource:
            ZConfig.schema.parseComponent(resource, self._loader, schema)

    def includeConfiguration(self, section, url, defines):
        url = self.normalizeURL(url)
        with self.openResource(url) as r:
            self._parse_resource(section, r, defines)

    # internal helper

    def _parse_resource(self, matcher, resource, defines=None):
        parser = ZConfig.cfgparser.ZConfigParser(resource, self, defines)
        parser.parse(matcher)


class CompositeHandler:

    def __init__(self, handlers, schema):
        self._handlers = handlers
        self._convert = schema.registry.get("basic-key")

    def __call__(self, handlermap):
        d = {}
        for name, callback in handlermap.items():
            n = self._convert(name)
            if n in d:
                raise ZConfig.ConfigurationError(
                    "handler name not unique when converted to a basic-key: "
                    + repr(name))
            d[n] = callback
        L = []
        for handler, value in self._handlers:
            if handler not in d:
                L.append(handler)
        if L:
            raise ZConfig.ConfigurationError(
                "undefined handlers: " + ", ".join(L))
        for handler, value in self._handlers:
            f = d[handler]
            if f is not None:
                f(value)

    def __len__(self):
        return len(self._handlers)


class Resource:
    """Object that allows an open file object and a URL to be bound
    together to ease handling.

    Instances have the attributes :attr:`file` and :attr:`url`, which
    store the constructor arguments. These objects also have a
    :meth:`close` method which will call :meth:`~file.close` on
    *file*, then set the :attr:`file` attribute to ``None`` and the
    :attr:`closed` attribute to ``True``. Using this object as a
    context manager also closes the file.

    All other attributes are delegated to *file*.
    """

    closed = False

    def __init__(self, file, url):
        self.file = file
        self.url = url

    def close(self):
        if self.file is not None:
            self.file.close()
            self.file = None
            self.closed = True

    def __getattr__(self, name):
        return getattr(self.file, name)

    def __enter__(self):
        return self

    def __exit__(self, t, v, tb):
        self.close()
