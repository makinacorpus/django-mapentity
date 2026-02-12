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
"""Tests of the %import mechanism.
"""

import unittest
from io import StringIO

import ZConfig
import ZConfig.tests.support


class TestImportFromConfiguration(ZConfig.tests.support.TestHelper,
                                  unittest.TestCase):

    def test_simple_import(self):
        schema = self.load_schema_text("<schema/>")
        loader = self.create_config_loader(schema)
        config, _ = loader.loadFile(
            StringIO("%import ZConfig.tests.library.widget\n"))
        # make sure we now have a "private" schema object; the only
        # way to get it is from the loader itself
        self.assertIsNot(schema, loader.schema)
        # make sure component types are only found on the private schema:
        loader.schema.gettype("widget-b")
        self.assertRaises(ZConfig.SchemaError, schema.gettype, "widget-b")

    def test_repeated_import(self):
        schema = self.load_schema_text("<schema/>")
        loader = self.create_config_loader(schema)
        config, _ = loader.loadFile(
            StringIO("%import ZConfig.tests.library.widget\n"
                     "%import ZConfig.tests.library.widget\n"))

    def test_missing_import(self):
        schema = self.load_schema_text("<schema/>")
        loader = self.create_config_loader(schema)
        self.assertRaises(ZConfig.SchemaError, loader.loadFile,
                          StringIO("%import ZConfig.tests.missing\n"))

    def test_empty_directive(self):
        schema = self.load_schema_text("<schema/>")
        loader = self.create_config_loader(schema)

        with self.assertRaises(ZConfig.ConfigurationSyntaxError) as cm:
            loader.loadFile(StringIO("%import\n"))

        self.assertIn('missing argument to %import directive',
                      str(cm.exception))
        self.assertIn('(line 1)', str(cm.exception))

    def test_bogus_directive(self):
        schema = self.load_schema_text("<schema/>")
        loader = self.create_config_loader(schema)

        with self.assertRaises(ZConfig.SchemaError) as cm:
            loader.loadFile(StringIO("%import .\n"))

        self.assertIn("illegal schema component name: '.'",
                      str(cm.exception))


def test_suite():
    return unittest.defaultTestLoader.loadTestsFromName(__name__)


if __name__ == '__main__':
    unittest.main(defaultTest='test_suite')
