Development
===========

Follow installation procedure, and then install development packages::

    python3 -m venv env && source ./env/bin/activate
    pip install -e .[dev] -U

Or use docker

::

    cp .env-dev.dist .env
    docker-compose build
    docker-compose up

Run tests
---------

::

    ./manage.py test

Or with docker

::

    docker-compose run --rm web ./manage.py test

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
