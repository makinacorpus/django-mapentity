Development
===========

Quickstart to run MapEntity in development :

::
    docker-compose build
    docker-compose run --rm web ./manage.py migrate
    docker-compose run --rm web ./manage.py createsuperuser
    docker-compose run --rm web ./manage.py update_permissions_mapentity
    docker-compose up

Get Screamshotter and convertit working:

To make the Screamshotter container work, it needs to access your web container by using your browser's URL.

If you use http://localhost:8000/ for development, it attempts to access itself to capture the web application.
To make it work in the development environment, you should use mapentity.local.



add in your /etc/hosts file :


127.0.0.1    mapentity.local

Then use http://mapentity.local:8000 in your browser


In production, if you use public domain (ex: http://mapentity.com, screamshotter will try to get capture from this
domain, so no problem will occur if this domain is public.


Tests
-----


Unit tests
##########

To run unit tests (excludes E2E tests):

::

    make test
    # Or directly with docker compose:
    docker compose run --rm web ./manage.py test --exclude-tag=e2e --parallel


E2E tests (Playwright)
######################

End-to-end (E2E) tests are written in Python using `Playwright <https://playwright.dev/python/>`_,
Django's ``StaticLiveServerTestCase``, and ``unittest`` (tagged with ``@tag("e2e")``).
They live in ``test_project/test_app/tests/e2e/``.

Playwright and the Chromium browser (with its system dependencies) are pre-installed in the ``base`` target of the ``Dockerfile`` (under ``PLAYWRIGHT_BROWSERS_PATH=/code/ms-playwright``).

Build or rebuild the Docker image if needed:

::

    docker compose build web

Run all Playwright E2E tests inside Docker:

::

    make test_e2e
    # Or via the alias:
    make run_e2e
    # Or directly with docker compose and Django's test runner:
    docker compose run --rm web ./manage.py test --tag=e2e -v 2

Run a specific E2E test module, class, or method:

::

    make test_e2e test_name=test_project.test_app.tests.e2e.test_01_list_view
    # Or directly:
    docker compose run --rm web ./manage.py test test_project.test_app.tests.e2e.test_01_list_view.DummyModelListViewE2ETest.test_should_display_the_list_page -v 2

Configure the Playwright browser or headless mode via environment variables:

- ``PLAYWRIGHT_BROWSER`` (or ``BROWSER`` with ``make``): ``chromium`` (default), ``firefox``, or ``webkit``. Note: only ``chromium`` is pre-installed in the Docker image by default; to use another browser inside a running container, run ``playwright install --with-deps firefox``.
- ``PLAYWRIGHT_HEADLESS`` (or ``HEADLESS`` with ``make``): ``true`` (default) or ``false``.
- ``PLAYWRIGHT_SLOW_MO`` (or ``SLOW_MO`` with ``make``): delay in milliseconds between Playwright actions (default: ``0``).
- ``PWDEBUG``: set to ``1`` to open the interactive Playwright Inspector.

::

    BROWSER=chromium verbose_level=2 make test_e2e

Displaying the browser window from Docker (X11 / XWayland)
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Since the tests run inside a Docker container, displaying the browser window on your host machine requires forwarding the host's X11 display socket into the container. When ``HEADLESS=false`` or ``PWDEBUG=1`` is set, the ``Makefile`` automatically passes ``-e DISPLAY=$DISPLAY -v /tmp/.X11-unix:/tmp/.X11-unix:rw`` to ``docker compose run``.

1. Authorize local Docker containers to connect to your X server on the host (once per session):

::

    xhost +local:docker

2. Run the tests with ``HEADLESS=false`` (and optionally ``SLOW_MO`` in milliseconds to slow down actions):

::

    HEADLESS=false SLOW_MO=300 make test_e2e test_name=test_project.test_app.tests.e2e.test_02_create_entity

3. Or use the interactive **Playwright Inspector** (step-by-step execution and selector debugging):

::

    PWDEBUG=1 make test_e2e test_name=test_project.test_app.tests.e2e.test_02_create_entity

4. If running directly with ``docker compose run`` without ``make``:

::

    xhost +local:docker
    docker compose run --rm \
      -e DISPLAY=$DISPLAY \
      -e PLAYWRIGHT_HEADLESS=false \
      -e PLAYWRIGHT_SLOW_MO=300 \
      -v /tmp/.X11-unix:/tmp/.X11-unix:rw \
      web ./manage.py test test_project.test_app.tests.e2e.test_02_create_entity -v 2


Release
-------

Set mapentity/VERSION

Set Changelog

Draft a new release on github
