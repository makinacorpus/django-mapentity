##############################################################################
#
# Copyright (c) 2007 Zope Foundation and Contributors.
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
"""\
Support for working with ZConfig data without a schema.

"""
__docformat__ = "reStructuredText"

import ZConfig.cfgparser


def loadConfigFile(file, url=None):
    c = Context()
    Parser(Resource(file, url), c).parse(c.top)
    return c.top


class Resource:

    def __init__(self, file, url=''):
        self.file, self.url = file, url


class Section(dict):

    imports = ()

    def __init__(self, type='', name='', data=None, sections=None):
        dict.__init__(self)
        if data:
            self.update(data)
        self.sections = sections or []
        self.type, self.name = type, name

    def addValue(self, key, value, *args):
        if key in self:
            self[key].append(value)
        else:
            self[key] = [value]

    def __str__(self, pre=''):
        result = []

        if self.imports:
            for pkgname in self.imports:
                result.append('%import ' + pkgname)
            result.append('')

        if self.type:
            if self.name:
                start = f'{pre}<{self.type} {self.name}>'
            else:
                start = f'{pre}<{self.type}>'
            result.append(start)
            pre += '  '

        lst = sorted(self.items())
        for name, values in lst:
            for value in values:
                result.append(f'{pre}{name} {value}')

        if self.sections and self:
            result.append('')

        for section in self.sections:
            result.append(section.__str__(pre))

        if self.type:
            pre = pre[:-2]
            result.append(f'{pre}</{self.type}>')
            result.append('')

        result = '\n'.join(result).rstrip()
        if not pre:
            result += '\n'
        return result


class Context:

    def __init__(self):
        self.top = Section()
        self.sections = []

    def startSection(self, container, type_, name):
        newsec = Section(type_, name)
        container.sections.append(newsec)
        return newsec

    def endSection(self, container, type_, name, newsect):
        pass

    def importSchemaComponent(self, pkgname):
        if pkgname not in self.top.imports:
            self.top.imports += (pkgname, )

    def includeConfiguration(self, section, newurl, defines):
        raise NotImplementedError('includes are not supported')


class Parser(ZConfig.cfgparser.ZConfigParser):

    def handle_define(self, section, rest):
        raise NotImplementedError('defines are not supported')
