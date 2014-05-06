MapEntity
=========

MapEntity is a CRUD interface for geospatial entities built with Django,
that powers `Geotrek <http://geotrek.fr>`_.

.. image:: https://pypip.in/v/mapentity/badge.png
        :target: https://pypi.python.org/pypi/mapentity

.. image:: https://pypip.in/d/mapentity/badge.png
        :target: https://pypi.python.org/pypi/mapentity

.. image:: https://travis-ci.org/makinacorpus/django-mapentity.png?branch=develop
    :target: https://travis-ci.org/makinacorpus/django-mapentity?branch=develop

.. image:: https://coveralls.io/repos/makinacorpus/django-mapentity/badge.png?branch=develop
    :target: https://coveralls.io/r/makinacorpus/django-mapentity?branch=develop

`See the full documentation <http://docs.mapentity.org/>`_.


=======
INSTALL
=======

( *under development* )

::

    pip install -e git+https://github.com/makinacorpus/django-mapentity.git@develop#egg=django-mapentity


Install GDAL with its development files. For example, on Ubuntu/Debian::

    $ sudo apt-get install libgdal-dev

Then install the Python packages::

    $ pip install -r requirements.txt
    $ python setup.py install

Yes we need to do both because requirements.txt lists dependencies that are
not yet on PyPI.


=======
AUTHORS
=======

|makinacom|_

.. |makinacom| image:: http://depot.makina-corpus.org/public/logo.gif
.. _makinacom:  http://www.makina-corpus.com


=======
LICENSE
=======

    * BSD New
