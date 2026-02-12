##############################################################################
#
# Copyright (c) 2017, 2018 Zope Foundation and Contributors.
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

import unittest

from ZConfig import ConfigurationError
from ZConfig import DataConversionError
from ZConfig.matcher import BaseMatcher
from ZConfig.matcher import SectionMatcher
from ZConfig.matcher import SectionValue
from ZConfig.tests.support import TestHelper


class SectionValueTestCase(unittest.TestCase):

    def test_repr(self):

        class MockMatcher:
            type = None

        matcher = MockMatcher()
        matcher.type = MockMatcher()
        matcher.type.name = 'matcher'

        sv = SectionValue({}, 'name', matcher)
        self.assertIn('name', repr(sv))

        sv = SectionValue({}, None, matcher)
        self.assertIn('at', repr(sv))

        self.assertIs(matcher, sv.getSectionMatcher())

    def test_str(self):
        d = {'k': 'v'}
        sv = SectionValue(d, None, None)
        self.assertEqual(
            'k                                       : v',
            str(sv))


class SectionMatcherTestCase(TestHelper, unittest.TestCase):

    def test_constructor_error(self):

        class Mock:
            name = 'name'

            def allowUnnamed(self):
                return False

        mock = Mock()
        self.assertRaisesRegex(ConfigurationError,
                               "sections may not be unnamed",
                               SectionMatcher,
                               mock, mock, None, None)


class BaseMatcherTestCase(TestHelper, unittest.TestCase):

    def test_repr(self):

        class Mock(dict):
            name = 'name'

        matcher = BaseMatcher(None, Mock(), None)
        repr(matcher)

    def test_duplicate_section_names(self):

        class Mock(dict):
            name = 'name'

        matcher = BaseMatcher(None, Mock(), None)
        matcher._sectionnames['foo'] = None

        self.assertRaisesRegex(ConfigurationError,
                               "section names must not be re-used",
                               matcher.addSection,
                               None, 'foo', None)

    def test_construct_errors(self):

        class MockType:
            attribute = 'attr'

            _multi = True
            _section = True

            def ismulti(self):
                return self._multi

            def issection(self):
                return self._section

        type_ = []
        matcher = BaseMatcher(None, type_, None)
        type_.append(('key', MockType()))

        class MockSection:
            def getSectionDefinition(self):
                return self

            def datatype(self, _s):
                raise ValueError()

        matcher._values['attr'] = [MockSection()]

        with self.assertRaises(DataConversionError):
            matcher.constuct()

        type_[0][1]._multi = False
        matcher._values['attr'] = MockSection()
        with self.assertRaises(DataConversionError):
            matcher.constuct()

    def test_create_child_bad_name(self):

        class MockType(list):
            name = 'foo'
            sectiontype = None

            def getsectioninfo(self, type_name, name):
                return self

            def isabstract(self):
                return False

            def isAllowedName(self, name):
                return False

        t = MockType()
        t.sectiontype = MockType()
        matcher = BaseMatcher(None, t, None)
        self.assertRaisesRegex(ConfigurationError,
                               'is not an allowed name',
                               matcher.createChildMatcher,
                               MockType(), 'ignored')
