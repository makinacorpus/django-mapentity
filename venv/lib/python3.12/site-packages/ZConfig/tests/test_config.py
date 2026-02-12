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
"""Tests of the configuration data structures and loader."""
import os
import tempfile
import unittest
from io import StringIO

import ZConfig
from ZConfig.tests.support import CONFIG_BASE
from ZConfig.tests.support import TestHelper


class ConfigurationTestCase(TestHelper, unittest.TestCase):

    schema = None

    def get_schema(self):
        if self.schema is None:
            ConfigurationTestCase.schema = ZConfig.loadSchema(
                CONFIG_BASE + "simple.xml")
        return self.schema

    def load(self, relurl, context=None):
        url = CONFIG_BASE + relurl
        self.conf, self.handlers = ZConfig.loadConfig(self.get_schema(), url)
        conf = self.conf
        self.assertIsNone(conf.getSectionName())
        self.assertIsNone(conf.getSectionType())
        return conf

    def loadtext(self, text):
        sio = StringIO(text)
        return self.loadfile(sio)

    def loadfile(self, file_or_path):
        schema = self.get_schema()
        self.conf, self.handlers = ZConfig.loadConfigFile(schema, file_or_path)
        return self.conf

    def check_simple_gets(self, conf):
        self.assertEqual(conf.empty, '')
        self.assertEqual(conf.int_var, 12)
        self.assertEqual(conf.neg_int, -2)
        self.assertEqual(conf.float_var, 12.02)
        self.assertEqual(conf.var1, 'abc')
        self.assertTrue(conf.true_var_1)
        self.assertTrue(conf.true_var_2)
        self.assertTrue(conf.true_var_3)
        self.assertTrue(not conf.false_var_1)
        self.assertTrue(not conf.false_var_2)
        self.assertTrue(not conf.false_var_3)
        self.assertEqual(conf.list_1, [])
        self.assertEqual(conf.list_2, ['abc'])
        self.assertEqual(conf.list_3, ['abc', 'def', 'ghi'])
        self.assertEqual(conf.list_4, ['[', 'what', 'now?', ']'])

    def test_simple_gets(self):
        conf = self.load("simple.conf")
        self.check_simple_gets(conf)

    def test_type_errors(self):
        Error = ZConfig.DataConversionError
        raises = self.assertRaises
        raises(Error, self.loadtext, "int-var true")
        raises(Error, self.loadtext, "float-var true")
        raises(Error, self.loadtext, "neg-int false")
        raises(Error, self.loadtext, "true-var-1 0")
        raises(Error, self.loadtext, "true-var-1 1")
        with raises(Error) as e:
            self.loadtext("true-var-1 -1")

        # str doesn't fail
        exc = e.exception
        str(exc)
        self.assertIsNone(exc.colno)
        self.assertIsNone(exc.url)

        exc.colno = 1
        exc.url = 'url'
        self.assertIn('url', str(exc))

    def test_simple_sections(self):
        self.schema = ZConfig.loadSchema(CONFIG_BASE + "simplesections.xml")
        conf = self.load("simplesections.conf")
        self.assertEqual(conf.var, "foo")
        # check each interleaved position between sections
        for c in "0123456":
            self.assertEqual(getattr(conf, "var_" + c), "foo-" + c)
        sect = list(sect for sect in conf.sections
                    if sect.getSectionName() == "name")[0]
        self.assertEqual(sect.var, "bar")
        self.assertEqual(sect.var_one, "splat")
        self.assertIsNone(sect.var_three)
        sect = list(sect for sect in conf.sections
                    if sect.getSectionName() == "delegate")[0]
        self.assertEqual(sect.var, "spam")
        self.assertEqual(sect.var_two, "stuff")
        self.assertIsNone(sect.var_three)

    def test_include(self):
        conf = self.load("include.conf")
        self.assertEqual(conf.var1, "abc")
        self.assertEqual(conf.var2, "value2")
        self.assertEqual(conf.var3, "value3")
        self.assertEqual(conf.var4, "value")

    def test_includes_with_defines(self):
        self.schema = ZConfig.loadSchemaFile(StringIO("""\
            <schema>
              <key name='refinner' />
              <key name='refouter' />
            </schema>
            """))
        conf = self.load("outer.conf")
        self.assertEqual(conf.refinner, "inner")
        self.assertEqual(conf.refouter, "outer")

    def test_define(self):
        conf = self.load("simple.conf")
        self.assertEqual(conf.getname, "value")
        self.assertEqual(conf.getnametwice, "valuevalue")
        self.assertEqual(conf.getdollars, "$$")
        self.assertEqual(conf.getempty, "xy")
        self.assertEqual(conf.getwords, "abc two words def")

    def test_define_errors(self):
        # doesn't raise if value is equal
        self.loadtext("%define a value\n%define a value\n")

        self.assertRaises(ZConfig.ConfigurationSyntaxError,
                          self.loadtext, "%define\n")
        self.assertRaises(ZConfig.ConfigurationSyntaxError,
                          self.loadtext, "%define abc-def\n")

        self.assertRaises(ZConfig.SubstitutionReplacementError,
                          self.loadtext,
                          "foo $name")

        with self.assertRaises(ZConfig.ConfigurationSyntaxError) as e:
            self.loadtext("%define a value\n%define a other\n")

        # str doesn't throw unexpected exceptions
        exc = e.exception
        self.assertIn('line', str(exc))
        self.assertNotIn('column', str(exc))
        # doesn't have these properties
        self.assertIsNone(exc.colno)
        self.assertIsNone(exc.url)

        # If we fill them in, we get different str output
        exc.colno = 10
        exc.url = 'a url'
        self.assertIn('column', str(exc))

        # There's also a case if we don't have a line number
        exc.lineno = None
        self.assertNotIn('line', str(exc))

    def test_bad_directive(self):
        self.assertRaisesRegex(ZConfig.ConfigurationSyntaxError,
                               'unknown directive',
                               self.loadtext, '%not a directive')

        self.assertRaisesRegex(ZConfig.ConfigurationSyntaxError,
                               'missing or unrecognized',
                               self.loadtext, '%')

    def test_bad_key(self):
        self.assertRaisesRegex(ZConfig.ConfigurationSyntaxError,
                               'malformed configuration data',
                               self.loadtext, '(int-var')

    def test_bad_section(self):
        self.schema = ZConfig.loadSchema(CONFIG_BASE + "simplesections.xml")
        self.assertRaisesRegex(ZConfig.ConfigurationSyntaxError,
                               'unexpected section end',
                               self.loadtext, '</close>')

        self.assertRaisesRegex(ZConfig.ConfigurationSyntaxError,
                               'unbalanced section end',
                               self.loadtext, '<section>\n</close>')

        self.assertRaisesRegex(ZConfig.ConfigurationSyntaxError,
                               'unclosed sections not allowed',
                               self.loadtext, '<section>\n')

        self.assertRaisesRegex(ZConfig.ConfigurationSyntaxError,
                               'malformed section header',
                               self.loadtext, '<section()>\n</close>')

        self.assertRaisesRegex(ZConfig.ConfigurationSyntaxError,
                               'malformed section end',
                               self.loadtext, '<section>\n</section')

        self.assertRaisesRegex(ZConfig.ConfigurationSyntaxError,
                               'malformed section start',
                               self.loadtext, '<section')

        # ConfigLoader.endSection raises this and it is recaught and
        # changed to a SyntaxError
        self.assertRaisesRegex(ZConfig.ConfigurationSyntaxError,
                               "no values for",
                               self.loadtext,
                               "<hasmin foo>\n</hasmin>")

    def test_configuration_error_str(self):

        e = ZConfig.ConfigurationError('message')
        self.assertEqual(e.message, 'message')
        self.assertEqual('message', str(e))

        # We can delete the message, for some reason
        del e.message

    def test_fragment_ident_disallowed(self):
        self.assertRaises(ZConfig.ConfigurationError,
                          self.load, "simplesections.conf#another")

    def test_load_from_fileobj(self):
        sio = StringIO("%define name value\n"
                       "getname x $name y \n")
        cf = self.loadfile(sio)
        self.assertEqual(cf.getname, "x value y")

    def test_load_from_abspath(self):
        fn = self.write_tempfile()
        try:
            self.check_load_from_path(fn)
        finally:
            os.unlink(fn)

    def test_load_from_relpath(self):
        fn = self.write_tempfile()
        dirname, name = os.path.split(fn)
        pwd = os.getcwd()
        try:
            os.chdir(dirname)
            self.check_load_from_path(name)
        finally:
            os.chdir(pwd)
            os.unlink(fn)

    def write_tempfile(self):
        fn = tempfile.mktemp()
        fp = open(fn, "w")
        fp.write("var1 value\n")
        fp.close()
        return fn

    def check_load_from_path(self, path):
        schema = self.get_schema()
        ZConfig.loadConfig(schema, path)


def test_suite():
    return unittest.defaultTestLoader.loadTestsFromName(__name__)


if __name__ == '__main__':
    unittest.main(defaultTest='test_suite')
