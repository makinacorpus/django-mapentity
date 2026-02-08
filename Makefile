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
	$(docker_compose) run --rm -it web coverage run --parallel-mode --concurrency=multiprocessing ./manage.py test $(test_name) --parallel -v $(verbose_level) || true
	$(docker_compose) run --rm -it web bash -c "coverage combine && coverage $(report)"
	$(docker_compose) run --rm -it web coverage xml -o coverage.xml
	rm .coverage* || true

verbose_level ?= 1
.PHONY: test
test:
	@$(PRINT_COLOR) "$(COLOR_SUCCESS) ### Start tests ### $(COLOR_RESET)\n"
	$(docker_compose) run --rm web ./manage.py test $(test_name) --parallel -v $(verbose_level)

messages_python:
	$(docker_compose) run --rm web ./manage.py makemessages -a --no-location --no-obsolete --no-wrap

messages_js:
	$(docker_compose) run --rm web ./manage.py makemessages -a -d djangojs --no-location --no-obsolete --no-wrap --ignore=node_modules/**

messages: messages_python messages_js

install_layers:
	$(docker_compose) run --rm web ./manage.py install_layer osm --order=0
	$(docker_compose) run --rm web ./manage.py install_layer opentopomap --order=1
	$(docker_compose) run --rm web ./manage.py install_layer ign cadastre --order=0 --overlay

serve_e2e:
	$(docker_compose) run -e DJANGO_SETTINGS_MODULE=test_project.settings.e2e --rm web ./manage.py migrate
	$(docker_compose) run -e DJANGO_SETTINGS_MODULE=test_project.settings.e2e --rm web ./manage.py flush --no-input
	$(docker_compose) run -e DJANGO_SETTINGS_MODULE=test_project.settings.e2e --rm web ./manage.py install_layer osm --order=0
	$(docker_compose) run -e DJANGO_SETTINGS_MODULE=test_project.settings.e2e --rm web ./manage.py install_layer opentopomap --order=1
	$(docker_compose) run -e DJANGO_SETTINGS_MODULE=test_project.settings.e2e --rm web ./manage.py install_layer ign cadastre --order=0 --overlay

	echo "from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.create_superuser('admin', 'admin@test.com', 'admin')" | $(docker_compose) run -e DJANGO_SETTINGS_MODULE=test_project.settings.e2e --rm web ./manage.py shell
	$(docker_compose) run -e DJANGO_SETTINGS_MODULE=test_project.settings.e2e --rm web ./manage.py create_test_data --dummies 20 --cities 5 --roads 10 --geopoints 10
	$(docker_compose) run -p 8000:8000 -e DJANGO_SETTINGS_MODULE=test_project.settings.e2e  -v ./:/code/src --rm web ./manage.py runserver 0.0.0.0:8000

BROWSER ?= electron
run_e2e:
	npx cypress run --browser $(BROWSER)