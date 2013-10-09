Installation
============


Requirements:

* Django 1.6
* A PostgreSQL database with PostGIS extension enabled
* GDAL with its development files. For example, on Debian::

    $ sudo apt-get install libgdal-dev

You might need to set a couple of environement variables to make sure the
install process can find GDAL headers::

    $ export CPLUS_INCLUDE_PATH=/usr/include/gdal
    $ export C_INCLUDE_PATH=/usr/include/gdal

Then install the Python packages::

    $ pip install -r requirements.txt
    $ python setup.py install

(Yes we need to do both because requirements.txt lists dependencies that are
not yet on PyPI.)

Install static assets as git submodules::

    $ git submodule init
    $ git submodule update
