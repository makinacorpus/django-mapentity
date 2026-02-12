import collections
import doctest
import io
import unittest

from zodbpickle import pickle_3 as pickle
from zodbpickle import pickletools_3 as pickletools

from . import _is_pure
from . import _is_pypy
from .pickletester_3 import AbstractBytesFallbackTests
from .pickletester_3 import AbstractBytestrTests
from .pickletester_3 import AbstractDispatchTableTests
from .pickletester_3 import AbstractPersistentPicklerTests
from .pickletester_3 import AbstractPickleModuleTests
from .pickletester_3 import AbstractPicklerUnpicklerObjectTests
from .pickletester_3 import AbstractPickleTests
from .pickletester_3 import BigmemPickleTests


if not _is_pypy and not _is_pure:
    try:
        from zodbpickle import _pickle
    except ModuleNotFoundError:
        has_c_implementation = False
    else:
        has_c_implementation = True
else:
    has_c_implementation = False


class PickleTests(AbstractPickleModuleTests):
    pass


class PyPicklerBase:

    pickler = pickle._Pickler
    unpickler = pickle._Unpickler

    def dumps(self, arg, proto=None, **kwds):
        f = io.BytesIO()
        p = self.pickler(f, proto, **kwds)
        p.dump(arg)
        f.seek(0)
        return bytes(f.read())

    def loads(self, buf, **kwds):
        f = io.BytesIO(buf)
        u = self.unpickler(f, **kwds)
        return u.load()


class PyPicklerTests(PyPicklerBase, AbstractPickleTests):
    pass


class PyPicklerBytestrTests(PyPicklerBase, AbstractBytestrTests):
    pass


class PyPicklerBytesFallbackTests(PyPicklerBase, AbstractBytesFallbackTests):
    pass


class InMemoryPickleTests(AbstractPickleTests, BigmemPickleTests):

    pickler = pickle._Pickler
    unpickler = pickle._Unpickler

    def dumps(self, arg, protocol=None):
        return pickle.dumps(arg, protocol)

    def loads(self, buf, **kwds):
        return pickle.loads(buf, **kwds)


class PyPersPicklerTests(AbstractPersistentPicklerTests):

    pickler = pickle._Pickler
    unpickler = pickle._Unpickler

    def dumps(self, arg, proto=None):
        class PersPickler(self.pickler):
            def persistent_id(subself, obj):
                return self.persistent_id(obj)
        f = io.BytesIO()
        p = PersPickler(f, proto)
        p.dump(arg)
        f.seek(0)
        return f.read()

    def loads(self, buf, **kwds):
        class PersUnpickler(self.unpickler):
            def persistent_load(subself, obj):
                return self.persistent_load(obj)
        f = io.BytesIO(buf)
        u = PersUnpickler(f, **kwds)
        return u.load()


class PyPicklerUnpicklerObjectTests(AbstractPicklerUnpicklerObjectTests):

    pickler_class = pickle._Pickler
    unpickler_class = pickle._Unpickler


class PyDispatchTableTests(AbstractDispatchTableTests):
    pickler_class = pickle._Pickler

    def get_dispatch_table(self):
        return pickle.dispatch_table.copy()


class PyChainDispatchTableTests(AbstractDispatchTableTests):
    pickler_class = pickle._Pickler

    def get_dispatch_table(self):
        return collections.ChainMap({}, pickle.dispatch_table)


if has_c_implementation:
    class CPicklerTests(PyPicklerTests):
        pickler = _pickle.Pickler
        unpickler = _pickle.Unpickler

    class CPicklerBytestrTests(PyPicklerBytestrTests):
        pickler = _pickle.Pickler
        unpickler = _pickle.Unpickler

    class CPicklerBytesFallbackTests(PyPicklerBytesFallbackTests):
        pickler = _pickle.Pickler
        unpickler = _pickle.Unpickler

    class CPersPicklerTests(PyPersPicklerTests):
        pickler = _pickle.Pickler
        unpickler = _pickle.Unpickler

    class CDumpPickle_LoadPickle(PyPicklerTests):
        pickler = _pickle.Pickler
        unpickler = pickle._Unpickler

    class DumpPickle_CLoadPickle(PyPicklerTests):
        pickler = pickle._Pickler
        unpickler = _pickle.Unpickler

    class CPicklerUnpicklerObjectTests(AbstractPicklerUnpicklerObjectTests):
        pickler_class = _pickle.Pickler
        unpickler_class = _pickle.Unpickler

    class CDispatchTableTests(AbstractDispatchTableTests):
        pickler_class = pickle.Pickler

        def get_dispatch_table(self):
            return pickle.dispatch_table.copy()

    class CChainDispatchTableTests(AbstractDispatchTableTests):
        pickler_class = pickle.Pickler

        def get_dispatch_table(self):
            return collections.ChainMap({}, pickle.dispatch_table)


def choose_tests():
    tests = [
        PickleTests,
        PyPicklerTests,
        PyPersPicklerTests,
        PyPicklerBytestrTests,
        PyPicklerBytesFallbackTests,
        PyDispatchTableTests,
        PyChainDispatchTableTests,
    ]
    if has_c_implementation:
        tests.extend([
            CPicklerTests,
            CPersPicklerTests,
            CPicklerBytestrTests,
            CPicklerBytesFallbackTests,
            CDumpPickle_LoadPickle,
            DumpPickle_CLoadPickle,
            PyPicklerUnpicklerObjectTests,
            CPicklerUnpicklerObjectTests,
            InMemoryPickleTests,
            CDispatchTableTests,
            CChainDispatchTableTests,
        ])
    return tests


def test_suite():
    return unittest.TestSuite([
        unittest.defaultTestLoader.loadTestsFromTestCase(t)
        for t in choose_tests()
    ] + [
        doctest.DocTestSuite(pickle),
        doctest.DocTestSuite(pickletools),
    ])
