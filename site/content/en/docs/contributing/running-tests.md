---
title: 'Running tests'
linkTitle: 'Running tests'
weight: 11
description: 'Instructions on how to run all existence tests.'
---

# E2E tests

**Initial steps**:
1. Run CVAT instance:
   ```
   docker-compose \
             -f docker-compose.yml \
             -f docker-compose.dev.yml \
             -f components/serverless/docker-compose.serverless.yml \
             -f tests/docker-compose.minio.yml \
             -f tests/docker-compose.file_share.yml up -d
   ```
1. Add test user in CVAT:
   ```
   docker exec -i cvat_server \
             /bin/bash -c \
             "echo \"from django.contrib.auth.models import User; User.objects.create_superuser('admin', 'admin@localhost.company', '12qwaszx')\" | python3 ~/manage.py shell"
   ```
1. Install npm dependencies:
   ```
   cd tests
   yarn --frozen-lockfile
   ```

**Running tests**

```
yarn run cypress:run:chrome
yarn run cypress:run:chrome:canvas3d
```

# REST API, SDK and CLI tests

**Initial steps**
1. Install all necessary requirements before running REST API tests:
   ```
   pip install -r ./tests/python/requirements.txt
   ```

**Running tests**

Run all REST API tests:

```
pytest ./tests/python
```

This command will automatically start all necessary docker containers.

If you want to start/stop these containers without running tests
use special options for it:

```
pytest ./tests/python --start-services
pytest ./tests/python --stop-services
```

If you need to rebuild your CVAT images add `--rebuild` option:
```
pytest ./tests/python --rebuild
```

# Unit tests

**Initial steps**
1. Install necessary Python dependencies:
   ```
   pip install -r cvat/requirements/testing.txt
   ```
1. Install npm dependencies:
   ```
   yarn --frozen-lockfile
   ```
1. Run CVAT instance
   ```
   docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
   ```

**Running tests**
1. Python tests
   ```
   python manage.py test --settings cvat.settings.testing cvat/apps utils/cli
   ```
1. JS tests
   ```
   cd cvat-core
   yarn run test
   ```
