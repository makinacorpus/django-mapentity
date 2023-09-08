Development
===========

Quickstart to run MapEntity in development :

    $ docker-compose build
    $ docker-compose run --rm web ./manage.py migrate
    $ docker-compose run --rm web ./manage.py createsuperuser
    $ docker-compose up


Release
-------

Set mapentity/VERSION

Set Changelog

Draft a new release on github
