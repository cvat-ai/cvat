SHELL := /bin/bash

.PHONY: all help prod-deploy prod-shell

# target: all - Default target. Does nothing.
all:
	@echo "Hello $(LOGNAME), nothing to do by default"
	@echo "Try 'make help'"

# target: help - Display callable targets.
help:
	@egrep "^# target:" [Mm]akefile

# target: prod-deploy - Builds, (re)creates, and starts all prod containers (run this from prod VM).
prod-deploy:
	docker-compose -f docker-compose.yml -f docker-compose.production.yml up --detach --build

# target: prod-shell - Starts a shell in the prod Django container (run this from prod VM).
prod-shell:
	docker exec -it cvat bash -ic 'python3 ~/manage.py shell'
