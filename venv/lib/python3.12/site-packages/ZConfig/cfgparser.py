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
"""Configuration parser."""

import re

import ZConfig
import ZConfig.url
from ZConfig.substitution import isname
from ZConfig.substitution import substitute


# _name_re does not allow "(" or ")" for historical reasons.  Though
# the restriction could be lifted, there seems no need to do so.
_name_re = r"[^\s()]+"
_keyvalue_rx = re.compile(r"(?P<key>%s)\s*(?P<value>[^\s].*)?$"
                          % _name_re)
_section_start_rx = re.compile(r"(?P<type>%s)"
                               r"(?:\s+(?P<name>%s))?"
                               r"$"
                               % (_name_re, _name_re))


class ZConfigParser:

    __slots__ = ('resource', 'context', 'lineno',
                 'stack', 'defines', 'file', 'url')

    def __init__(self, resource, context, defines=None):
        self.resource = resource
        self.context = context
        self.file = resource.file
        self.url = resource.url
        self.lineno = 0
        self.stack = []   # [(type, name, prevmatcher), ...]
        if defines is None:
            defines = {}
        self.defines = defines

    def nextline(self):
        line = self.file.readline()
        if line:
            self.lineno += 1
            return False, line.strip()
        return True, None

    def parse(self, section):
        done, line = self.nextline()
        while not done:
            if line[:1] in ("", "#"):
                # blank line or comment
                pass

            elif line[:2] == "</":
                # section end
                if line[-1] != ">":
                    self.error("malformed section end")
                section = self.end_section(section, line[2:-1])

            elif line[0] == "<":
                # section start
                if line[-1] != ">":
                    self.error("malformed section start")
                section = self.start_section(section, line[1:-1])

            elif line[0] == "%":
                self.handle_directive(section, line[1:])

            else:
                self.handle_key_value(section, line)

            done, line = self.nextline()

        if self.stack:
            self.error("unclosed sections not allowed")

    def start_section(self, section, rest):
        isempty = rest[-1:] == "/"
        if isempty:
            rest = rest[:-1]
        text = rest.rstrip()
        # parse section start stuff here
        m = _section_start_rx.match(text)
        if not m:
            self.error("malformed section header")
        type_, name = m.group('type', 'name')
        type_ = self._normalize_case(type_)
        if name:
            name = self._normalize_case(name)
        try:
            newsect = self.context.startSection(section, type_, name)
        except ZConfig.ConfigurationError as e:
            self.error(e.message)

        if isempty:
            self.context.endSection(section, type_, name, newsect)
            return section

        self.stack.append((type_, name, section))
        return newsect

    def end_section(self, section, rest):
        if not self.stack:
            self.error("unexpected section end")
        type_ = self._normalize_case(rest.rstrip())
        opentype, name, prevsection = self.stack.pop()
        if type_ != opentype:
            self.error("unbalanced section end")
        try:
            self.context.endSection(
                prevsection, type_, name, section)
        except ZConfig.DataConversionError as e:
            if e.lineno < 0:
                e.lineno = self.lineno
            if not e.url:
                e.url = self.url
            raise
        except ZConfig.ConfigurationError as e:
            self.error(e.message)
        return prevsection

    def handle_key_value(self, section, rest):
        m = _keyvalue_rx.match(rest)
        if not m:
            self.error("malformed configuration data")
        key, value = m.group('key', 'value')
        if not value:
            value = ''
        else:
            value = self.replace(value)
        try:
            section.addValue(key, value, (self.lineno, None, self.url))
        except ZConfig.ConfigurationError as e:
            if getattr(e, 'lineno', -1) < 0:
                e.lineno = self.lineno
            if not e.url:
                e.url = self.url
            raise

    def handle_directive(self, section, rest):
        m = _keyvalue_rx.match(rest)
        if not m:
            self.error("missing or unrecognized directive")
        name, arg = m.group('key', 'value')
        if name not in ("define", "import", "include"):
            self.error("unknown directive: " + repr(name))
        if not arg:
            self.error("missing argument to %%%s directive" % name)

        getattr(self, 'handle_' + name)(section, arg)

    def handle_import(self, section, rest):
        pkgname = self.replace(rest.strip())
        self.context.importSchemaComponent(pkgname)

    def handle_include(self, section, rest):
        rest = self.replace(rest.strip())
        newurl = ZConfig.url.urljoin(self.url, rest)
        self.context.includeConfiguration(section, newurl, self.defines)

    def handle_define(self, section, rest):
        parts = rest.split(None, 1)
        defname = self._normalize_case(parts[0])
        defvalue = ''
        if len(parts) == 2:
            defvalue = parts[1]
        if defname in self.defines:
            if self.defines[defname] != defvalue:
                self.error("cannot redefine " + repr(defname))
        if not isname(defname):
            self.error("not a substitution legal name: " + repr(defname))
        self.defines[defname] = self.replace(defvalue)

    def replace(self, text):
        try:
            return substitute(text, self.defines)
        except ZConfig.SubstitutionReplacementError as e:
            e.lineno = self.lineno
            e.url = self.url
            raise

    def error(self, message):
        raise ZConfig.ConfigurationSyntaxError(message, self.url, self.lineno)

    def _normalize_case(self, string):
        # This method is factored out solely to allow subclasses to modify
        # the behavior of the parser.
        return string.lower()
