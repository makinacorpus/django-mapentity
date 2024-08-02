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

.PHONY: check-flake8
check-flake8:
	@$(PRINT_COLOR) "$(COLOR_SUCCESS) \n### check-flake8 ###\n $(COLOR_RESET)\n"
	$(docker_compose) run --rm web flake8 mapentity test_project test_app

.PHONY: check-lint
check-lint: check-flake8

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
