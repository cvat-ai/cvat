VERSION ?= latest

build:
	./build.sh ${VERSION}

up:
	docker-compose -f rebotics/docker-compose.yml up

down:
	docker-compose -f rebotics/docker-compose.yml down

shell:
	docker exec -it -u root reb_cvat bash -i

patch:
	bump2version --allow-dirty --config-file ./.bumpversion patch

minor:
	bump2version --config-file ./.bumpversion minor

major:
	bump2version --config-file ./.bumpversion major