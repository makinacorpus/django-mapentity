'''
The zodbpickle.pickle module exposes the standard behavior of
the pickle module.
This is backward compatible, but has the effect that by default,
on Python3 you get the fast implementation, while on Python2
you get the slow implementation.

This module is a version that always exposes the fast implementation
of pickling and avoids the need to explicitly touch internals.


Note: We are intentionally using "import *" in this context.
The imported modules define an __all__ variable, which contains
all the names that it wants to export.
So this is a rare case where 'import *' is exactly the right thing to do.
'''


import sys
import warnings

from .pickle_3 import *


# do not share the globals with a slow version
del sys.modules['zodbpickle.pickle_3']

# isort: off
# also make sure that we really have the fast version
if is_pure:  # noqa: F405
    warnings.warn("fastpickle imported under 'PURE_PYTHON' environment")
else:
    from ._pickle import *  # noqa: E402 module level import not at top of file
