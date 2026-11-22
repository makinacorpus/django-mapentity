ifeq (, $(shell which docker-compose))
  docker_compose=docker compose
else
  docker_compose=docker-compose
endif

-include Makefile.perso.mk

###########################
#          colors         #
###########################
PRINT_COLOR = printf
COLOR_SUCCESS = \033[1;32m
COLOR_DEBUG = \033[36m
COLOR_RESET = \033[0m

.PHONY: serve
serve:
	@$(PRINT_COLOR) "$(COLOR_SUCCESS) \n### Start server ###\n $(COLOR_RESET)\n"
	$(docker_compose) up

###########################
#          Lint           #
###########################
.PHONY: format
format:
	$(docker_compose) run --remove-orphans --no-deps --rm web ruff format mapentity test_project

.PHONY: lint
lint:
	$(docker_compose) run --remove-orphans --no-deps --rm web ruff check --fix mapentity test_project

.PHONY: force_lint
force_lint:
	$(docker_compose) run --remove-orphans --no-deps --rm web ruff check --fix --unsafe-fixes mapentity test_project

.PHONY: quality
quality: lint format

###########################
#          Test           #
###########################

verbose_level ?= 1
report ?= report -m
.PHONY: coverage
coverage:
	@$(PRINT_COLOR) "$(COLOR_SUCCESS) ### Start coverage ### $(COLOR_RESET)\n"
	$(docker_compose) run --rm -it web coverage run --parallel-mode --concurrency=multiprocessing ./manage.py test $(test_name) --exclude-tag=e2e --parallel -v $(verbose_level) || true
	$(docker_compose) run --rm -it web bash -c "coverage combine && coverage $(report)"
	$(docker_compose) run --rm -it web coverage xml -o coverage.xml
	rm .coverage* || true

verbose_level ?= 1
.PHONY: test
test:
	@$(PRINT_COLOR) "$(COLOR_SUCCESS) ### Start tests ### $(COLOR_RESET)\n"
	$(docker_compose) run --rm web ./manage.py test $(test_name) --exclude-tag=e2e --parallel -v $(verbose_level)

BROWSER ?= chromium
HEADLESS ?= true
SLOW_MO ?= 0
PWDEBUG ?= 0
E2E_DOCKER_ARGS = -e DJANGO_SETTINGS_MODULE=test_project.settings.e2e -e PLAYWRIGHT_BROWSER=$(BROWSER) -e PLAYWRIGHT_HEADLESS=$(HEADLESS) -e PLAYWRIGHT_SLOW_MO=$(SLOW_MO) -e PWDEBUG=$(PWDEBUG)
ifneq ($(HEADLESS),true)
  E2E_DOCKER_ARGS += -e DISPLAY=$(DISPLAY) -v /tmp/.X11-unix:/tmp/.X11-unix:rw
  PARALLEL ?= 1
else ifeq ($(PWDEBUG),1)
  E2E_DOCKER_ARGS += -e DISPLAY=$(DISPLAY) -v /tmp/.X11-unix:/tmp/.X11-unix:rw
  PARALLEL ?= 1
else
  PARALLEL ?= 4
endif

.PHONY: prepare_e2e serve_e2e test_e2e run_e2e codegen
prepare_e2e:
	$(docker_compose) run -e DJANGO_SETTINGS_MODULE=test_project.settings.e2e --rm --no-deps web bash -c '\
		set -e; \
		python -c "import django; django.setup(); from django.db import connection; connection.prepare_database()"; \
		./manage.py migrate; \
		./manage.py flush --no-input; \
		./manage.py update_permissions_mapentity; \
		./manage.py install_layer osm --order=0; \
		./manage.py install_layer opentopomap --order=1; \
		./manage.py install_layer ign cadastre --order=0 --overlay; \
		echo "from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.create_superuser(\"admin\", \"admin@test.com\", \"admin\")" | ./manage.py shell; \
		./manage.py create_test_data --dummies 20 --cities 5 --roads 10 --geopoints 10'

serve_e2e: prepare_e2e
	$(docker_compose) run -p 8000:8000 -e DJANGO_SETTINGS_MODULE=test_project.settings.e2e -v ./:/code/src --rm web ./manage.py runserver 0.0.0.0:8000

test_e2e:
	@$(PRINT_COLOR) "$(COLOR_SUCCESS) ### Start E2E tests (Playwright) ### $(COLOR_RESET)\n"
	$(docker_compose) run $(E2E_DOCKER_ARGS) --rm web ./manage.py test $(or $(test_name),--tag=e2e) --parallel=$(PARALLEL) -v $(verbose_level)

run_e2e: test_e2e

URL ?= http://localhost:8000
codegen: prepare_e2e
	@$(PRINT_COLOR) "$(COLOR_SUCCESS) ### Start Playwright Codegen (Recorder) ### $(COLOR_RESET)\n"
	$(docker_compose) run -e DISPLAY=$(DISPLAY) -e DJANGO_SETTINGS_MODULE=test_project.settings.e2e -v /tmp/.X11-unix:/tmp/.X11-unix:rw --rm --no-deps web bash -c '\
		set -e; \
		./manage.py runserver 127.0.0.1:8000 --noreload >/dev/null 2>&1 & \
		for i in $$(seq 1 50); do python -c "import urllib.request; urllib.request.urlopen(\"http://127.0.0.1:8000/login/\")" >/dev/null 2>&1 && break || sleep 0.2; done; \
		playwright codegen --target python $(URL)'

messages_python:
	$(docker_compose) run --rm web ./manage.py makemessages -a --no-location --no-obsolete --no-wrap

messages_js:
	$(docker_compose) run --rm web ./manage.py makemessages -a -d djangojs --no-location --no-obsolete --no-wrap --ignore=node_modules/** --ignore=mapentity/static/mapentity/vendor/**

messages: messages_python messages_js

install_layers:
	$(docker_compose) run --rm web ./manage.py install_layer osm --order=0
	$(docker_compose) run --rm web ./manage.py install_layer opentopomap --order=1
	$(docker_compose) run --rm web ./manage.py install_layer ign cadastre --order=0 --overlay