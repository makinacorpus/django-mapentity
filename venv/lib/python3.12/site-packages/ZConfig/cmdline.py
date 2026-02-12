##############################################################################
#
# Copyright (c) 2003, 2018 Zope Foundation and Contributors.
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

"""Support for command-line overrides for configuration settings.

This module exports an extended version of the :class:`~.ConfigLoader`
class from the :mod:`ZConfig.loader` module. This provides support for
overriding specific settings from the configuration file from the
command line, without requiring the application to provide specific
options for everything the configuration file can include.

Each setting is given by a value specifier string, as described by
:meth:`ExtendedConfigLoader.addOption`.

"""

import ZConfig
import ZConfig.loader
import ZConfig.matcher


class ExtendedConfigLoader(ZConfig.loader.ConfigLoader):
    """A :class:`~.ConfigLoader` subclass that adds support for
    command-line overrides.
    """

    def __init__(self, schema):
        ZConfig.loader.ConfigLoader.__init__(self, schema)
        self.clopts = []   # [(optpath, value, source-position), ...]

    def addOption(self, spec, pos=None):
        """Add a single value to the list of overridden values.

        The *spec* argument is a value specifier string of the form
        ``optionpath=value``. For example::

            some/path/to/key=value

        The *optionpath* specifies the "full path" to the
        configuration setting: it can contain a sequence of names,
        separated by ``/`` characters. Each name before the last names
        a section from the configuration file, and the last name
        corresponds to a key within the section identified by the
        leading section names. If *optionpath* contains only one name,
        it identifies a key in the top-level schema. *value* is a
        string that will be treated just like a value in the
        configuration file.

        A source position for the specifier may be given as *pos*. If
        *pos* is specified and not ``None``, it must be a sequence of
        three values. The first is the URL of the source (or some
        other identifying string). The second and third are the line
        number and column of the setting. These position information
        is only used to construct a :exc:`~.DataConversionError` when
        data conversion fails.
        """
        if pos is None:
            pos = "<command-line option>", -1, -1
        if "=" not in spec:
            e = ZConfig.ConfigurationSyntaxError(
                "invalid configuration specifier", *pos)
            e.specifier = spec
            raise e
        # For now, just add it to the list; not clear that checking
        # against the schema at this point buys anything.
        opt, val = spec.split("=", 1)
        optpath = opt.split("/")
        if "" in optpath:
            # // is not allowed in option path
            e = ZConfig.ConfigurationSyntaxError(
                "'//' is not allowed in an option path", *pos)
            e.specifier = spec
            raise e
        self.clopts.append((optpath, val, pos))

    def createSchemaMatcher(self):
        if self.clopts:
            sm = ExtendedSchemaMatcher(self.schema)
            sm.set_optionbag(self.cook())
        else:
            sm = ZConfig.loader.ConfigLoader.createSchemaMatcher(self)
        return sm

    def cook(self):
        return OptionBag(self.schema, self.schema, self.clopts)


class OptionBag:
    def __init__(self, schema, sectiontype, options):
        self.sectiontype = sectiontype
        self.schema = schema
        self.keypairs = {}
        self.sectitems = []
        self._basic_key = schema.registry.get("basic-key")
        for item in options:
            optpath, val, pos = item
            name = sectiontype.keytype(optpath[0])
            if len(optpath) == 1:
                self.add_value(name, val, pos)
            else:
                self.sectitems.append(item)

    def basic_key(self, s, pos):
        try:
            return self._basic_key(s)
        except ValueError as e:
            raise ZConfig.ConfigurationSyntaxError(
                f"could not convert basic-key value: {e}", *pos)

    def add_value(self, name, val, pos):
        if name in self.keypairs:
            L = self.keypairs[name]
        else:
            L = []
            self.keypairs[name] = L
        L.append((val, pos))

    def __contains__(self, name):
        return name in self.keypairs

    def get_key(self, name):
        """Return a list of (value, pos) items for the key 'name'.

        The returned list may be empty.
        """
        L = self.keypairs.get(name)
        if L:
            del self.keypairs[name]
            return L
        return []

    def keys(self):
        return self.keypairs.keys()

    def get_section_info(self, type_, name):
        L = []  # what pertains to the child section
        R = []  # what we keep
        for item in self.sectitems:
            optpath, val, pos = item
            s = optpath[0]
            bk = self.basic_key(s, pos)
            if name and self._normalize_case(s) == name:
                L.append((optpath[1:], val, pos))
            elif bk == type_:
                L.append((optpath[1:], val, pos))
            else:
                R.append(item)
        if L:
            self.sectitems[:] = R
            return OptionBag(self.schema, self.schema.gettype(type_), L)

    def finish(self):
        if self.sectitems or self.keypairs:
            raise ZConfig.ConfigurationError(
                "not all command line options were consumed")

    def _normalize_case(self, string):
        return string.lower()


class MatcherMixin:

    def set_optionbag(self, bag):
        self.optionbag = bag

    def addValue(self, key, value, position):
        try:
            realkey = self.type.keytype(key)
        except ValueError as e:
            raise ZConfig.DataConversionError(e, key, position)

        if realkey in self.optionbag:
            return
        ZConfig.matcher.BaseMatcher.addValue(self, key, value, position)

    def createChildMatcher(self, type_, name):
        sm = ZConfig.matcher.BaseMatcher.createChildMatcher(self, type_, name)
        bag = self.optionbag.get_section_info(type_.name, name)
        if bag is not None:
            sm = ExtendedSectionMatcher(
                sm.info, sm.type, sm.name, sm.handlers)
            sm.set_optionbag(bag)
        return sm

    def finish_optionbag(self):
        for key in list(self.optionbag.keys()):
            for val, pos in self.optionbag.get_key(key):
                ZConfig.matcher.BaseMatcher.addValue(self, key, val, pos)
        self.optionbag.finish()


class ExtendedSectionMatcher(MatcherMixin, ZConfig.matcher.SectionMatcher):
    def finish(self):
        self.finish_optionbag()
        return ZConfig.matcher.SectionMatcher.finish(self)


class ExtendedSchemaMatcher(MatcherMixin, ZConfig.matcher.SchemaMatcher):
    def finish(self):
        self.finish_optionbag()
        return ZConfig.matcher.SchemaMatcher.finish(self)
