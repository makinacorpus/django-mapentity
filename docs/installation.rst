Installation
============


Requirements:

* Django 1.6
* A PostgreSQL database with PostGIS extension enabled
* GDAL with its development files. For example, on Debian::

    $ sudo apt-get install libgdal-dev

Then install the Python packages::

    $ pip install -r requirements.txt
    $ python setup.py install

(Yes we need to do both because requirements.txt lists dependencies that are
not yet on PyPI.)
