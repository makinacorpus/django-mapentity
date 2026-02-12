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
from io import StringIO

from ZConfig import validator
from ZConfig.tests import support


def run_validator(*args):
    return validator.main(args)


class TestValidator(unittest.TestCase):

    def test_no_schema(self):
        sio = StringIO()
        with support.stderr_replaced(sio):
            with self.assertRaises(SystemExit) as cm:
                run_validator()
        self.assertEqual(cm.exception.code, 2)
        err = sio.getvalue()
        # Checked separately since these are included very differently
        # with different versions of Python's argparse module.
        self.assertIn('-s/--schema', err)
        self.assertIn(' required', err)

    def test_schema_only(self):
        res = run_validator("--schema", support.input_file('simple.xml'))
        self.assertEqual(res, 0)

    @support.with_stdin_from_input_file('simple.conf')
    def test_schema_only_redirect(self):
        res = run_validator("--schema", support.input_file('simple.xml'))
        self.assertEqual(res, 0)

    def test_good_config(self):
        res = run_validator("--schema", support.input_file('simple.xml'),
                            support.input_file('simple.conf'),
                            support.input_file('simple.conf'))
        self.assertEqual(res, 0)

    def test_bad_config(self):
        sio = StringIO()
        with support.stderr_replaced(sio):
            res = run_validator("--schema", support.input_file("simple.xml"),
                                support.input_file("outer.conf"))
        self.assertEqual(res, 1)
        self.assertIn("'refouter' is not a known key name", sio.getvalue())


def test_suite():
    return unittest.defaultTestLoader.loadTestsFromName(__name__)


if __name__ == '__main__':
    unittest.main(defaultTest='test_suite')
