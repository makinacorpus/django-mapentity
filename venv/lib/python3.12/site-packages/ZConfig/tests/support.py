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

"""Support code shared among the tests."""

import contextlib
import os
import pathlib
import sys
from io import StringIO

import ZConfig
from ZConfig.loader import ConfigLoader
from ZConfig.url import urljoin


INPUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "input"))
CONFIG_BASE = '%s/' % pathlib.Path(INPUT_DIR).as_uri()


def input_file(fname):
    return os.path.abspath(os.path.join(INPUT_DIR, fname))


@contextlib.contextmanager
def _replaced_stream(name, buf=None):
    if buf is None:
        buf = StringIO()
    old_stream = getattr(sys, name)
    setattr(sys, name, buf)
    try:
        yield
    finally:
        setattr(sys, name, old_stream)


def stderr_replaced(buf=None):
    return _replaced_stream('stderr', buf)


def stdout_replaced(buf=None):
    return _replaced_stream('stdout', buf)


def with_stdin_from_input_file(fname):
    input_fname = input_file(fname)

    @contextlib.contextmanager
    def stdin_replaced():
        old_stdin = sys.stdin
        sys.stdin = open(input_fname)
        try:
            yield
        finally:
            sys.stdin.close()
            sys.stdin = old_stdin

    def make_wrapper(f):
        def f2(self):
            with stdin_replaced():
                f(self)
        return f2

    return make_wrapper


class TestHelper:
    """Utility methods which can be used with the schema support."""

    def load_both(self, schema_url, conf_url):
        schema = self.load_schema(schema_url)
        conf = self.load_config(schema, conf_url)
        return schema, conf

    def load_schema(self, relurl):
        self.url = urljoin(CONFIG_BASE, relurl)
        self.schema = ZConfig.loadSchema(self.url)
        self.assertTrue(self.schema.issection())
        return self.schema

    def load_schema_text(self, text, url=None):
        sio = StringIO(text)
        self.schema = ZConfig.loadSchemaFile(sio, url)
        return self.schema

    def load_config(self, schema, conf_url, num_handlers=0):
        conf_url = urljoin(CONFIG_BASE, conf_url)
        loader = self.create_config_loader(schema)
        self.conf, self.handlers = loader.loadURL(conf_url)
        self.assertEqual(len(self.handlers), num_handlers)
        return self.conf

    def load_config_text(self, schema, text, num_handlers=0, url=None):
        sio = StringIO(text)
        loader = self.create_config_loader(schema)
        self.conf, self.handlers = loader.loadFile(sio, url)
        self.assertEqual(len(self.handlers), num_handlers)
        return self.conf

    def create_config_loader(self, schema):
        return ConfigLoader(schema)
