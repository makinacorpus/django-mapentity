##############################################################################
#
# Copyright (c) 2002, 2018 Zope Foundation and Contributors.
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
Test support for ZConfig.components.logger.

"""

import logging
import os
import tempfile
from io import StringIO

import ZConfig
import ZConfig.tests.support
from ZConfig.components.logger import loghandler


class LoggingTestHelper(ZConfig.tests.support.TestHelper):

    # Not derived from unittest.TestCase; some test runners seem to
    # think that means this class contains tests.

    # XXX This tries to save and restore the state of logging around
    # the test.  Somewhat surgical; there may be a better way.

    def setUp(self):
        self._created = []
        self._old_logger = logging.getLogger()
        self._old_level = self._old_logger.level
        self._old_handlers = self._old_logger.handlers[:]
        self._old_logger.handlers[:] = []
        self._old_logger.setLevel(logging.WARN)

        self._old_logger_dict = logging.root.manager.loggerDict.copy()
        logging.root.manager.loggerDict.clear()

    def tearDown(self):
        logging.root.manager.loggerDict.clear()
        logging.root.manager.loggerDict.update(self._old_logger_dict)

        for h in self._old_logger.handlers:
            self._old_logger.removeHandler(h)
        for h in self._old_handlers:
            self._old_logger.addHandler(h)  # pragma: no cover
        self._old_logger.setLevel(self._old_level)

        while self._created:
            os.unlink(self._created.pop())

        self.assertEqual(loghandler._reopenable_handlers, [])
        loghandler.closeFiles()
        loghandler._reopenable_handlers == []

    def mktemp(self):
        fd, fn = tempfile.mkstemp()
        os.close(fd)
        self._created.append(fn)
        return fn

    def move(self, fn):
        nfn = self.mktemp()
        os.rename(fn, nfn)
        return nfn

    _schema = None

    def get_schema(self):
        if self._schema is None:
            sio = StringIO(self._schematext)
            self.__class__._schema = ZConfig.loadSchemaFile(sio)
        return self._schema

    def get_config(self, text):
        conf, handler = ZConfig.loadConfigFile(
            self.get_schema(), StringIO(text))
        self.assertTrue(not handler)
        return conf
