##############################################################################
#
# Copyright (c) 2009 Zope Foundation and Contributors.
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
import doctest
import logging
import os
import os.path
import unittest

import manuel.capture
import manuel.doctest
import manuel.testing


options = doctest.REPORT_NDIFF | doctest.ELLIPSIS

old = {}


def setUp(test):
    logger = logging.getLogger()
    old['level'] = logger.level
    old['handlers'] = logger.handlers[:]


def tearDown(test):
    logger = logging.getLogger()
    logger.level = old['level']
    logger.handlers = old['handlers']


def findRoot():
    here = os.path.dirname(os.path.abspath(__file__))
    while not os.path.exists(os.path.join(here, 'setup.py')):
        prev, here = here, os.path.dirname(here)
        if here == prev:
            # Let's avoid infinite loops at root
            raise AssertionError('could not find my setup.py')
    return here


def docSetUp(test):
    # Python makes __path__ and __file__ relative in some
    # cases (such as when we're executing with the 'ZConfig'
    # directory on sys.path as CWD). This breaks finding
    # schema components when we change directories.
    import ZConfig.components.logger as logger
    logger.__file__ = os.path.abspath(logger.__file__)
    logger.__path__ = [os.path.abspath(x) for x in logger.__path__]

    old['pwd'] = os.getcwd()
    doc_path = os.path.join(
        findRoot(),
        'docs')
    os.chdir(doc_path)
    setUp(test)


def docTearDown(test):
    os.chdir(old['pwd'])
    tearDown(test)
    old.clear()


def test_suite():
    root = findRoot()
    plugins = manuel.doctest.Manuel(optionflags=options)
    plugins += manuel.capture.Manuel()
    return unittest.TestSuite([
        manuel.testing.TestSuite(
            plugins,
            os.path.join(root, 'README.rst'),
            setUp=setUp, tearDown=tearDown,
        ),
        manuel.testing.TestSuite(
            plugins,
            os.path.join(root, 'docs', 'using-logging.rst'),
            globs={'resetLoggers': lambda: tearDown(None)},
            setUp=docSetUp, tearDown=docTearDown,
        ),
    ])


if __name__ == '__main__':
    unittest.main(defaultTest='test_suite')
