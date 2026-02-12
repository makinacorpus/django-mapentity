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

from abc import ABC
from abc import abstractmethod


_marker = object()


class Factory(ABC):
    """Generic wrapper for instance construction.

    Calling the factory causes the instance to be created if it hasn't
    already been created, and returns the object.  Calling the factory
    multiple times returns the same object.

    The instance is created using the factory's create() method, which
    must be overriden by subclasses.

    """

    def __init__(self):
        self.instance = _marker

    def __call__(self):
        if self.instance is _marker:
            self.instance = self.create()
        return self.instance

    @abstractmethod
    def create(self):
        "Subclasses must override create()"
