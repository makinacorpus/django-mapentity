Installation
============

A PostGIS database
------------------

In order to use MapEntity you'll need to create a geospatial database. Feel
free to skip this section if you already know how to do this. Here is how you
can create a PostGIS database::

As user ``postgres``, create a new user and database::

    $ createuser -PSRD dbuser
    Enter password for new role:
    Enter it again:
    $ createdb --owner=dbuser spatialdb

Now enable PostGIS extension for your new database::

    $ psql -q spatialdb
    spatialdb=# CREATE EXTENSION postgis;

Python environment
------------------

Create a *virtualenv*, and activate it::

    virtualenv env/
    source env/bin/activate


Dependencies
------------

Install GDAL with its development files. For example, on Ubuntu/Debian::

    $ sudo apt-get install libgdal-dev

You might need to set a couple of environement variables to make sure the
install process can find GDAL headers::

    $ export CPLUS_INCLUDE_PATH=/usr/include/gdal
    $ export C_INCLUDE_PATH=/usr/include/gdal

Then install the Python packages::

    $ pip install -r requirements.txt
    $ python setup.py install

Download static assets (JavaScript libraries etc.), currently managed as
git submodules::

    $ git submodule init
    $ git submodule update


Since you will PostgreSQL, also install its python library::

   $ pip install psycopg2
