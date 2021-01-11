SHELL := /bin/bash

.PHONY: all help prod-deploy prod-shell prod-logs prod-tail-logs

# target: all - Default target. Does nothing.
all:
	@echo "Hello $(LOGNAME), nothing to do by default"
	@echo "Try 'make help'"

# target: help - Display callable targets.
help:
	@egrep "^# target:" [Mm]akefile

# target: prod-deploy - Builds, (re)creates, and starts all prod containers (run this from prod VM).
prod-deploy:
	docker-compose \
	    -f docker-compose.yml \
			-f docker-compose.production.yml \
			-f components/analytics/docker-compose.analytics.yml \
			up --detach --build

# target: prod-shell - Starts a shell in the prod Django container (run this from prod VM).
prod-shell:
	docker exec -it cvat bash -ic 'python3 ~/manage.py shell'

# target: prod-logs - Prints logs from running cvat container.
prod-tail-logs:
  docker logs --follow cvat

# target: prod-tail-logs - Tails logs from running cvat container.
prod-tail-logs:
  docker logs --follow --since=0s cvat
