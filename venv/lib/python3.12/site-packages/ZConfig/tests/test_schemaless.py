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
Test driver for ZConfig.schemaless.

"""
__docformat__ = "reStructuredText"

import unittest

import manuel.doctest
import manuel.testing

from ZConfig.schemaless import Section


class TestSection(unittest.TestCase):

    def test_init_with_data(self):
        s = Section(data={'k': 'v'})
        self.assertDictEqual(s, {'k': 'v'})


def test_suite():
    return unittest.TestSuite([
        unittest.defaultTestLoader.loadTestsFromName(__name__),
        manuel.testing.TestSuite(
            manuel.doctest.Manuel(),
            '../schemaless.txt'),
    ])


if __name__ == '__main__':
    unittest.main(defaultTest='test_suite')
