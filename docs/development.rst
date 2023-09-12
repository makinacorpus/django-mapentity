Development
===========

Quickstart to run MapEntity in development :

    $ docker-compose build
    $ docker-compose run --rm web ./manage.py migrate
    $ docker-compose run --rm web ./manage.py createsuperuser
    $ docker-compose up

Develop with docker::

    $ docker-compose up

Get Screamshoter and convertit working:

To make the screenshotter container work, it needs to access your web container by using your browser's URL.

If you use http://localhost:8000/ for development, it attempts to access itself to capture the web application.
To make it work in the development environment, you should use mapentity.local.



add in your /etc/hosts file :


127.0.0.1    localhost mapentity.local

Then use http://mapentity.local:8000 in your browser


In production, if you use public domain (ex: http://mapentity.com, screamshotter will try to get capture from this
domain, so no problem will occur if this domain is public.


Release
-------

Set mapentity/VERSION

Set Changelog

Draft a new release on github
