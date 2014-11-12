Development
===========

Follow installation procedure, and then install development packages::

    $ pip install -r dev-requirements.txt


Release
-------

We use *zest.releaser*, but since we have git submodules, we can't use the ``fullrelease``
command. Follow those step to release:

Update version and changelog release date:

::

    prerelease

::

    git tag -a X.Y.Z

    python setup.py sdist register upload

::

    postrelease
