VERSION ?= latest

build:
	./build.sh ${VERSION}

build-cvat:
	./build.sh ${VERSION} cvat

build-opa:
	./build.sh ${VERSION} opa

build-analytics:
	./build.sh ${VERSION} analytics

SERVICES ?= cvat_server
up:
	docker-compose -f rebotics/docker-compose.yml up ${SERVICES}

up-analytics:
	docker-compose -f rebotics/docker-compose.yml -f rebotics/components/analytics/docker-compose.analytics.yml up ${SERVICES} logstash

down:
	docker-compose -f rebotics/docker-compose.yml down

down-analytics:
	docker-compose -f rebotics/docker-compose.yml -f rebotics/components/analytics/docker-compose.analytics.yml down

shell:
	docker exec -it -u root reb_cvat bash -i

patch:
	bump2version --allow-dirty --config-file ./.bumpversion patch

minor:
	bump2version --config-file ./.bumpversion minor

major:
	bump2version --config-file ./.bumpversion major

unpatch:
	git tag -d v`cat ./VERSION`
	git reset HEAD~1 --soft
	git restore --staged ./.bumpversion ./VERSION
	git checkout -- ./.bumpversion ./VERSION

# Default deploy setup for CI
ENVIRONMENT ?= r3dev
AWS_REGION ?= us-west-2
ECR_PROFILE ?= ecr_v3_dev
S3_PROFILE ?= aws_cf_s3
ECR_TEMPLATE ?= 119987807155.dkr.ecr.us-west-2.amazonaws.com/{app_name}-repo-{environment}
S3_TEMPLATE ?= s3://retechcfrepo/119987807155/rebotics/{environment}/services/{app_name}-info.zip
NOTIFY_ECS ?= yes

deploy_app:
	python3 control.py deploy-app \
	 	--aws-region "${AWS_REGION}" \
		--ecr-profile "${ECR_PROFILE}" \
		--s3-profile "${S3_PROFILE}" \
		--ecr-template "${ECR_TEMPLATE}" \
		--s3-template "${S3_TEMPLATE}" \
		--environment "${ENVIRONMENT}" \
		--application "${APPLICATION}" \
		--version ${VERSION} \
		--notify-ecs ${NOTIFY_ECS}
