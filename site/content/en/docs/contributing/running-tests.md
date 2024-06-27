---
title: 'Running tests'
linkTitle: 'Running tests'
weight: 11
description: 'Instructions on how to run all existence tests.'
---

# E2E tests

**Initial steps**:
1. Run CVAT instance:
   ```shell
   docker compose \
             -f docker-compose.yml \
             -f docker-compose.dev.yml \
             -f components/serverless/docker-compose.serverless.yml \
             -f tests/docker-compose.minio.yml \
             -f tests/docker-compose.file_share.yml up -d
   ```
1. Add test user in CVAT:
   ```shell
   docker exec -i cvat_server \
             /bin/bash -c \
             "echo \"from django.contrib.auth.models import User; User.objects.create_superuser('admin', 'admin@localhost.company', '12qwaszx')\" | python3 ~/manage.py shell"
   ```
1. Install npm dependencies:
   ```
   cd tests
   yarn --frozen-lockfile
   ```

If you want to get a code coverage report, instrument the code:
```
yarn --frozen-lockfile
yarn run coverage
```

**Running tests**

```
yarn run cypress:run:chrome
yarn run cypress:run:chrome:canvas3d
```

# REST API, SDK and CLI tests

**Initial steps**

1. Follow {{< ilink "/docs/api_sdk/sdk/developer-guide" "this guide" >}} to prepare
   `cvat-sdk` and `cvat-cli` source code
1. Install all necessary requirements before running REST API tests:
   ```
   pip install -r ./tests/python/requirements.txt
   pip install -e ./cvat-sdk
   pip install -e ./cvat-cli
   ```
1. Stop any other CVAT containers which you run previously. They keep ports
which are used by containers for the testing system.

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

If you want to get a code coverage report, use special option for it:
```
COVERAGE_PROCESS_START=.coveragerc pytest ./tests/python --rebuild --cov --cov-report xml
```

**Debugging**

Currently, this is only supported in deployments based on Docker Compose,
which should be enough to fix errors arising in REST API tests.

To debug a server deployed with Docker, you need to do the following:

- Adjust env variables in the `docker-compose.dev.yml` file for your test case

- Rebuild the images and start the test containers:

```bash
CVAT_DEBUG_ENABLED=yes pytest --rebuild --start-services tests/python
```

Now, you can use VS Code tasks to attach to the running server containers.
To attach to a container, run one of the following tasks:
- `REST API tests: Attach to server` for the server container
- `REST API tests: Attach to RQ low` for the low priority queue worker
- `REST API tests: Attach to RQ default` for the default priority queue worker

> If you have a custom development environment setup, you need to adjust
host-remote path mappings in the `.vscode/launch.json`:
```json
...
"pathMappings": [
   {
      "localRoot": "${workspaceFolder}/my_venv",
      "remoteRoot": "/opt/venv",
   },
   {
      "localRoot": "/some/other/path",
      "remoteRoot": "/some/container/path",
   }
]
```

Extra options:
- If you want the server to wait for a debugger on startup,
  use the `CVAT_DEBUG_WAIT_CLIENT` environment variable:
  ```bash
  CVAT_DEBUG_WAIT_CLIENT=yes pytest ...
  ```
- If you want to change the default debugging ports, check the `*_DEBUG_PORT`
  variables in the `docker-compose.dev.yml`


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
1. Build CVAT server image
   ```
   docker compose -f docker-compose.yml -f docker-compose.dev.yml build cvat_server
   ```
1. Run cvat_opa container
   ```
   docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d cvat_opa
   ```

**Running tests**
1. Python tests
   ```
   python manage.py test --settings cvat.settings.testing cvat/apps -v 2
   ```

If you want to get a code coverage report, run the next command:
   ```
   coverage run manage.py test --settings cvat.settings.testing cvat/apps -v 2
   ```

1. JS tests
   ```
   cd cvat-core
   yarn run test
   ```

**Debug python unit tests**
1. Run `server: tests` debug task in VSCode
1. If you want to debug particular tests then change the configuration
of the corresponding task in `./vscode/launch.json`, for example:
   ```json
   {
       "name": "server: tests",
       "type": "python",
       "request": "launch",
       "justMyCode": false,
       "stopOnEntry": false,
       "python": "${command:python.interpreterPath}",
       "program": "${workspaceRoot}/manage.py",
       "args": [
           "test",
           "--settings",
           "cvat.settings.testing",
           "cvat/apps/engine",
           "-v", "2",
           "-k", "test_api_v2_projects_",
       ],
       "django": true,
       "cwd": "${workspaceFolder}",
       "env": {},
       "console": "internalConsole"
   }
   ```


<a id="opa-tests"></a>
## IAM and Open Policy Agent tests

### Generate tests

```bash
python cvat/apps/iam/rules/tests/generate_tests.py
```

### Run testing

- In a Docker container
```bash
docker compose run --rm -v "$PWD:/mnt/src:ro" -w /mnt/src \
    cvat_opa test -v cvat/apps/*/rules
```

- or execute OPA directly
```bash
curl -L -o opa https://openpolicyagent.org/downloads/v0.63.0/opa_linux_amd64_static
chmod +x ./opa
./opa test cvat/apps/*/rules
```

### Linting Rego

The Rego policies in this project are linted using [Regal](https://github.com/styrainc/regal).

- In a Docker container
```bash
docker run --rm -v ${PWD}:/mnt/src:ro -w /mnt/src \
    ghcr.io/styrainc/regal:0.11.0 \
    lint cvat/apps/*/rules
```

- or execute Regal directly
```bash
curl -L -o regal https://github.com/StyraInc/regal/releases/download/v0.11.0/regal_Linux_x86_64
chmod +x ./regal
./regal lint cvat/apps/*/rules
```
