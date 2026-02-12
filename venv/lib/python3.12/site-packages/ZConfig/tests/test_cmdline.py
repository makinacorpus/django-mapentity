##############################################################################
#
# Copyright (c) 2003 Zope Foundation and Contributors.
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

"""Tests of the command-line integration."""

import unittest

import ZConfig
import ZConfig.tests.support
from ZConfig.cmdline import ExtendedConfigLoader


class CommandLineTest(ZConfig.tests.support.TestHelper, unittest.TestCase):

    clopts = ()

    def create_config_loader(self, schema):
        loader = ExtendedConfigLoader(schema)
        for item in self.clopts:
            loader.addOption(*item)
        return loader

    def test_loading(self):
        schema = self.load_schema_text("""\
            <schema>
              <sectiontype name='st'>
                <key name='innerkey'/>
              </sectiontype>
              <key name='mykey'/>
              <section name='*' type='st' attribute='sect'/>
            </schema>
            """)
        self.clopts = [("mykey=splat!", None),
                       ("section/innerkey=spoogey", None)]
        bag = self.create_config_loader(schema).cook()
        # Test a variety of queries on the OptionBag:
        self.assertIn("mykey", bag)
        self.assertNotIn("another", bag)
        self.assertEqual(bag.get_section_info("st", None), None)
        self.assertEqual(bag.get_section_info("st", "missing-sect"), None)
        # Consume everything in the OptionBag:
        L = bag.get_key("mykey")
        s, pos = L[0]
        self.assertEqual(len(L), 1)
        self.assertEqual(s, "splat!")
        bag2 = bag.get_section_info("st", "section")
        self.assertIn("innerkey", bag2)
        self.assertNotIn("another", bag2)
        L = bag2.get_key("innerkey")
        s, pos = L[0]
        self.assertEqual(len(L), 1)
        self.assertEqual(s, "spoogey")
        # "Finish" to make sure everything has been consumed:
        bag2.finish()
        bag.finish()

    def test_named_sections(self):
        schema = self.load_schema_text("""\
            <schema>
              <abstracttype name='at'/>
              <sectiontype name='st1' implements='at'>
                <key name='k1'/>
              </sectiontype>
              <sectiontype name='st2' implements='at'>
                <key name='k2'/>
              </sectiontype>
              <section name='foo' type='at'/>
              <section name='bar' type='st2'/>
            </schema>
            """)
        self.clopts = [("foo/k1=v1", None), ("bar/k2=v2", ("someurl", 2, 3))]
        loader = self.create_config_loader(schema)
        bag = loader.cook()
        foo = bag.get_section_info("st2", "foo")
        bar = bag.get_section_info("st2", "bar")
        bag.finish()
        self.assertEqual(bar.get_key("k2"), [("v2", ("someurl", 2, 3))])
        bar.finish()
        # Ignore foo for now; it's not really important *when* it fails.

        # ValueErrors are converted into ConfigurationSyntaxErrors
        self.assertRaisesRegex(ZConfig.ConfigurationSyntaxError,
                               "could not convert",
                               foo.basic_key,
                               'invalid name', ('<place>', 1,))

        # missing keys return empty lists
        self.assertEqual(foo.get_key('no such key'), [])

        # VE for matchers do the same conversion
        matcher = loader.createSchemaMatcher()
        self.assertRaisesRegex(ZConfig.DataConversionError,
                               "value did not match",
                               matcher.addValue,
                               'invalid name', 'value', (1, 1, '<place>'))

    simple_schema = None

    def get_simple_schema(self):
        if self.simple_schema is None:
            self.__class__.simple_schema = self.load_schema_text("""\
                <schema>
                  <key name='k0'/>
                  <key name='k1'/>
                  <key name='k2' datatype='integer'/>
                  <key name='k3' datatype='integer' default='19'/>
                </schema>
                """)
        return self.simple_schema

    def test_reading_config(self):
        self.clopts = [("k1=stringvalue", None), ("k2=12", None)]
        schema = self.get_simple_schema()
        conf = self.load_config_text(schema, """\
            k0 stuff
            k1 replaced-stuff
            k2 42
            """)
        self.assertEqual(conf.k0, "stuff")
        self.assertEqual(conf.k1, "stringvalue")
        self.assertEqual(conf.k2, 12)
        self.assertEqual(conf.k3, 19)

    def test_reading_config_without_clopts(self):
        schema = self.get_simple_schema()
        conf = self.load_config_text(schema, """\
            k0 stuff
            k1 special-stuff
            k2 42
            """)
        self.assertEqual(conf.k0, "stuff")
        self.assertEqual(conf.k1, "special-stuff")
        self.assertEqual(conf.k2, 42)
        self.assertEqual(conf.k3, 19)

    def test_unknown_key(self):
        self.clopts = [("foo=bar", None)]
        schema = self.get_simple_schema()
        self.assertRaises(ZConfig.ConfigurationError,
                          self.load_config_text, schema, "")

    def test_too_many_keys(self):
        self.clopts = [("k1=v1", None), ("k1=v2", None)]
        schema = self.get_simple_schema()
        self.assertRaises(ZConfig.ConfigurationError,
                          self.load_config_text, schema, "")

    def test_bad_datatype(self):
        self.clopts = [("k2=42.0", None)]
        schema = self.get_simple_schema()
        self.assertRaises(ZConfig.DataConversionError,
                          self.load_config_text, schema, "")

    def test_without_clopts(self):
        self.clopts = []
        schema = self.get_simple_schema()
        conf = self.load_config_text(schema, "k3 42")
        self.assertEqual(conf.k0, None)
        self.assertEqual(conf.k1, None)
        self.assertEqual(conf.k2, None)
        self.assertEqual(conf.k3, 42)

    def test_section_contents(self):
        schema = self.load_schema_text("""\
            <schema>
              <sectiontype name='st'>
                <key name='k1'/>
                <key name='k2' default='3' datatype='integer'/>
                <multikey name='k3'>
                  <default>k3-v1</default>
                  <default>k3-v2</default>
                  <default>k3-v3</default>
                </multikey>
              </sectiontype>
              <section name='s1' type='st'/>
              <section name='s2' type='st'/>
            </schema>
            """)
        self.clopts = [("s1/k1=foo", None),
                       ("s2/k3=value1", None),
                       ("s2/k3=value2", None),
                       ("s1/k2=99", None),
                       ("s2/k3=value3", None),
                       ("s2/k3=value4", None),
                       ]
        conf = self.load_config_text(schema, "<st s1/>\n<st s2/>")
        self.assertEqual(conf.s1.k1, "foo")
        self.assertEqual(conf.s1.k2, 99)
        self.assertEqual(conf.s1.k3, ["k3-v1", "k3-v2", "k3-v3"])
        self.assertEqual(conf.s2.k1, None)
        self.assertEqual(conf.s2.k2, 3)
        self.assertEqual(conf.s2.k3, ["value1", "value2", "value3", "value4"])

        self.clopts = [("path/that/dne=foo",)]
        self.assertRaisesRegex(ZConfig.ConfigurationError,
                               "not all command line options were consumed",
                               self.load_config_text,
                               schema, "<st s1/>")

    def test_bad_overrides(self):
        schema = self.get_simple_schema()
        self.clopts = [('',)]
        self.assertRaisesRegex(ZConfig.ConfigurationSyntaxError,
                               "invalid configuration specifier",
                               self.create_config_loader,
                               schema)

        self.clopts = [('double//slashes=value',)]
        self.assertRaisesRegex(ZConfig.ConfigurationSyntaxError,
                               "not allowed in an option path",
                               self.create_config_loader,
                               schema)
