Development
===========

Quickstart to run MapEntity in development :

::
    make serve

Then run initial commands i another terminal :

::
    docker-compose run --rm web ./manage.py migrate
    docker-compose run --rm web ./manage.py createsuperuser
    docker-compose run --rm web ./manage.py update_permissions_mapentity
    make watch


Get Screamshotter and convertit working:

To make the Screamshotter container work, it needs to access your web container by using your browser's URL.

If you use http://localhost:8000/ for development, it attempts to access itself to capture the web application.
To make it work in the development environment, you should use mapentity.local.



add in your /etc/hosts file :


127.0.0.1    mapentity.local

Then use http://mapentity.local:8000 in your browser


In production, if you use public domain (ex: http://mapentity.com, screamshotter will try to get capture from this
domain, so no problem will occur if this domain is public.


Release
-------

Set mapentity/VERSION

Set Changelog

Draft a new release on github
