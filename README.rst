MapEntity
=========

MapEntity is a CRUD interface for geospatial entities built with Django.

.. image:: https://pypip.in/v/django-mapentity/badge.png
        :target: https://pypi.python.org/pypi/django-mapentity

.. image:: https://pypip.in/d/django-mapentity/badge.png
        :target: https://pypi.python.org/pypi/django-mapentity

.. image:: https://travis-ci.org/makinacorpus/django-mapentity.png
    :target: https://travis-ci.org/makinacorpus/django-mapentity

.. image:: https://coveralls.io/repos/makinacorpus/django-mapentity/badge.png
    :target: https://coveralls.io/r/makinacorpus/django-mapentity


Installation
============

Install GDAL with its development files. For example, on Debian::

    $ sudo apt-get install libgdal-dev

Then install the Python packages::

    $ pip install -r requirements.txt
    $ python setup.py install

Yes we need to do both because requirements.txt lists dependencies that are
not yet on PyPI.
