=========
MapEntity
=========

MapEntity is a CRUD interface for geospatial entities built with Django.


Installation
============

Install GDAL with its development files. For example, on Debian::

    $ sudo apt-get install libgdal-dev

Then install the Python packages::

    $ pip install -r requirements.txt
    $ python setup.py install

Yes we need to do both because requirements.txt lists dependencies that are
not yet on PyPI.
