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
"""Utility that manages the binding of configuration data to a section."""

import ZConfig
from ZConfig.info import ValueInfo


class BaseMatcher:
    def __init__(self, info, type_, handlers):
        self.info = info
        self.type = type_
        self._values = {}
        for _type_key, type_info in type_:
            if type_info.name == "+" and not type_info.issection():
                v = {}
            elif type_info.ismulti():
                v = []
            else:
                v = None
            assert type_info.attribute is not None
            self._values[type_info.attribute] = v
        self._sectionnames = {}
        self.handlers = handlers if handlers is not None else []

    def __repr__(self):
        clsname = self.__class__.__name__
        extra = "type " + repr(self.type.name)
        return f"<{clsname} for {extra}>"

    def addSection(self, type_, name, sectvalue):
        if name:
            if name in self._sectionnames:
                raise ZConfig.ConfigurationError(
                    "section names must not be re-used within the"
                    " same container:" + repr(name))
            self._sectionnames[name] = name
        ci = self.type.getsectioninfo(type_, name)
        attr = ci.attribute
        v = self._values[attr]
        if ci.ismulti():
            v.append(sectvalue)
        elif v is None:
            self._values[attr] = sectvalue
        else:  # pragma: no cover
            raise ZConfig.ConfigurationError(
                "too many instances of %s section" % repr(ci.sectiontype.name))

    def addValue(self, key, value, position):
        try:
            realkey = self.type.keytype(key)
        except ValueError as e:
            raise ZConfig.DataConversionError(e, key, position)
        arbkey_info = None
        for i in range(len(self.type)):
            k, ci = self.type[i]
            if k == realkey:
                break
            if ci.name == "+" and not ci.issection():
                arbkey_info = k, ci
        else:
            if arbkey_info is None:
                raise ZConfig.ConfigurationError(
                    repr(key) + " is not a known key name")
            k, ci = arbkey_info
        if ci.issection():  # pragma: no cover
            if ci.name:
                extra = " in %s sections" % repr(self.type.name)
            else:
                extra = ""
            raise ZConfig.ConfigurationError(
                f"{repr(key)} is not a valid key name{extra}")

        ismulti = ci.ismulti()
        attr = ci.attribute
        assert attr is not None
        v = self._values[attr]
        if v is None:
            if k == '+':
                v = {}  # pragma: no cover
            elif ismulti:
                v = []  # pragma: no cover
            self._values[attr] = v
        elif not ismulti:
            if k != '+':
                raise ZConfig.ConfigurationError(
                    repr(key) + " does not support multiple values")
        elif len(v) == ci.maxOccurs:  # pragma: no cover
            # This code may be impossible to hit. Previously it would
            # have raised a NameError because it used an unbound
            # local.
            raise ZConfig.ConfigurationError(
                "too many values for " + repr(ci))

        value = ValueInfo(value, position)
        if k == '+':
            if ismulti:
                if realkey in v:
                    v[realkey].append(value)
                else:
                    v[realkey] = [value]
            else:
                if realkey in v:  # pragma: no cover
                    raise ZConfig.ConfigurationError(
                        "too many values for " + repr(key))
                v[realkey] = value
        elif ismulti:
            v.append(value)
        else:
            self._values[attr] = value

    def createChildMatcher(self, type_, name):
        ci = self.type.getsectioninfo(type_.name, name)
        assert not ci.isabstract()
        if not ci.isAllowedName(name):
            raise ZConfig.ConfigurationError(
                "%s is not an allowed name for %s sections"
                % (repr(name), repr(ci.sectiontype.name)))
        return SectionMatcher(ci, type_, name, self.handlers)

    def finish(self):
        """Check the constraints of the section and convert to an application
        object."""
        values = self._values
        for key, ci in self.type:
            if key:
                key = repr(key)
            else:
                key = "section type " + repr(ci.sectiontype.name)
            assert ci.attribute is not None
            attr = ci.attribute
            v = values[attr]
            if ci.name == '+' and not ci.issection():
                # v is a dict
                if ci.minOccurs > len(v):
                    raise ZConfig.ConfigurationError(
                        "no keys defined for the %s key/value map; at least %d"
                        " must be specified" % (attr, ci.minOccurs))
            if v is None and ci.minOccurs:
                default = ci.getdefault()
                if default is None:
                    raise ZConfig.ConfigurationError(
                        f"no values for {key}; {ci.minOccurs} required")
                else:
                    v = values[attr] = default[:]  # pragma: no cover
            if ci.ismulti():
                if not v:
                    default = ci.getdefault()
                    if isinstance(default, dict):
                        v.update(default)
                    else:
                        v[:] = default
                if len(v) < ci.minOccurs:
                    raise ZConfig.ConfigurationError(
                        "not enough values for %s; %d found, %d required"
                        % (key, len(v), ci.minOccurs))
            if v is None and not ci.issection():
                if ci.ismulti():
                    v = ci.getdefault()[:]  # pragma: no cover
                else:
                    v = ci.getdefault()
                values[attr] = v
        return self.constuct()

    def constuct(self):
        values = self._values
        for name, ci in self.type:
            assert ci.attribute is not None
            attr = ci.attribute
            if ci.ismulti():
                if ci.issection():
                    v = []
                    for s in values[attr]:
                        if s is not None:
                            st = s.getSectionDefinition()
                            try:
                                s = st.datatype(s)
                            except ValueError as e:
                                raise ZConfig.DataConversionError(
                                    e, s, (-1, -1, None))

                        v.append(s)
                elif ci.name == '+':
                    v = values[attr]
                    for key, val in v.items():
                        v[key] = [vi.convert(ci.datatype) for vi in val]
                else:
                    v = [vi.convert(ci.datatype) for vi in values[attr]]
            elif ci.issection():
                if values[attr] is not None:
                    st = values[attr].getSectionDefinition()
                    try:
                        v = st.datatype(values[attr])
                    except ValueError as e:
                        raise ZConfig.DataConversionError(
                            e, values[attr], (-1, -1, None))

                else:
                    v = None
            elif name == '+':
                v = values[attr]
                if not v:
                    for key, val in ci.getdefault().items():
                        v[key] = val.convert(ci.datatype)
                else:
                    for key, val in v.items():
                        v[key] = val.convert(ci.datatype)
            else:
                v = values[attr]
                if v is not None:
                    v = v.convert(ci.datatype)
            values[attr] = v
            if ci.handler is not None:
                self.handlers.append((ci.handler, v))
        return self.createValue()

    def createValue(self):
        return SectionValue(self._values, None, self)


class SectionMatcher(BaseMatcher):
    def __init__(self, info, type_, name, handlers):
        if name or info.allowUnnamed():
            self.name = name
        else:
            raise ZConfig.ConfigurationError(
                repr(type_.name) + " sections may not be unnamed")
        BaseMatcher.__init__(self, info, type_, handlers)

    def createValue(self):
        return SectionValue(self._values, self.name, self)


class SchemaMatcher(BaseMatcher):
    def __init__(self, schema):
        BaseMatcher.__init__(self, schema, schema, [])

    def finish(self):
        # Since there's no outer container to call datatype()
        # for the schema, we convert on the way out.
        v = BaseMatcher.finish(self)
        v = self.type.datatype(v)
        if self.type.handler is not None:
            self.handlers.append((self.type.handler, v))
        return v


class SectionValue:
    """Generic 'bag-of-values' object for a section.

    Derived classes should always call the SectionValue constructor
    before attempting to modify self.
    """

    def __init__(self, values, name, matcher):
        self.__dict__.update(values)
        self._name = name
        self._matcher = matcher
        self._attributes = tuple(values.keys())

    def __repr__(self):
        if self._name:
            # probably unique for a given config file; more readable than id()
            name = repr(self._name)
        else:
            # identify uniquely
            name = "at %#x" % id(self)
        clsname = self.__class__.__name__
        return f"<{clsname} for {self._matcher.type.name} {name}>"

    def __str__(self):
        lst = []
        attrnames = sorted([s for s in self.__dict__ if s[0] != "_"])
        for k in attrnames:
            v = getattr(self, k)
            lst.append('%-40s: %s' % (k, v))
        return '\n'.join(lst)

    def getSectionName(self):
        return self._name

    def getSectionType(self):
        return self._matcher.type.name

    def getSectionDefinition(self):
        return self._matcher.type

    def getSectionMatcher(self):
        return self._matcher

    def getSectionAttributes(self):
        return self._attributes
