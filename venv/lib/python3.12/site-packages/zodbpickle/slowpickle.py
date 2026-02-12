'''
The zodbpickle.pickle module exposes the standard behavior of
the pickle module.
This is backward compatible, but has the effect that by default,
on Python3 you get the fast implementation, while on Python2
you get the slow implementation.

This module is a version that always exposes the slow implementation
of pickling and avoids the need to explicitly touch internals.


Note: We are intentionally using "import *" in this context.
The imported modules define an __all__ variable, which contains
all the names that it wants to export.
So this is a rare case where 'import *' is exactly the right thing to do.
'''

import sys

import zodbpickle.pickle_3 as p


# undo the replacement with fast versions
p.Pickler, p.Unpickler = p._Pickler, p._Unpickler
p.dump, p.dumps, p.load, p.loads = p._dump, p._dumps, p._load, p._loads
del p

# isort: off
# pick up all names that the module defines
from .pickle_3 import *  # noqa: E402 module level import not at top of file


# do not share the globals with a fast version
del sys.modules['zodbpickle.pickle_3']
