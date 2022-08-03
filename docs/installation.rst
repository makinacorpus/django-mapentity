Installation
============

System prerequisites
--------------------

For GeoDjango to work, your system must meet the following requirements::

    $ sudo apt install binutils libproj-dev gdal-bin

For weasyprint and PDF generation, you need::

    $ sudo apt install libjpeg62 libjpeg62-dev zlib1g-dev libcairo2 libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf2.0-0 libffi-dev shared-mime-info

If you use spatialite, you will need::

    $ sudo apt install libsqlite3-mod-spatialite

Else, if you use PostGIS, you will need::

    $ sudo apt install libpq-dev

Manual installation With a PostGIS database
-------------------------------------------

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

Create a *virtualenv*, and activate it::

    virtualenv env/
    source env/bin/activate

Then install the Python packages::

    $ pip install mapentity

Since you will PostgreSQL, also install its python library::

   $ pip install psycopg2

