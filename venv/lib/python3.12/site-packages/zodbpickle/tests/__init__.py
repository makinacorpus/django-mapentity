import os
import platform


py_impl = getattr(platform, 'python_implementation', lambda: None)
_is_pypy = py_impl() == 'PyPy'
_is_jython = py_impl() == 'Jython'
_is_pure = int(os.environ.get('PURE_PYTHON', '0'))
