<!--
 Copyright (C) 2021-2022 Intel Corporation

 SPDX-License-Identifier: MIT
-->

# Testing infrastructure for REST API v2.0

## Motivation

It was very annoying to support the testing infrastructure with FakeRedis,
unittest framework, hardcoded data in the code.
[DRF testing](https://www.django-rest-framework.org/api-guide/testing/)
approach works well only for a single server. But if you have a number
of microservices, it becomes really hard to implement reliable tests.
For example, CVAT consists of server itself, OPA, Redis, DB, Nuclio services.
Also it is worth to have a real instance with real data inside and tests
the server calling REST API directly (as it done by users).

## How to run?
**Initial steps**

1. On Debian/Ubuntu, make sure that your `$USER` is in `docker` group:
   ```shell
   sudo usermod -aG docker $USER
   ```
1. Follow [this guide](../../site/content/en/docs/api_sdk/sdk/developer-guide.md) to prepare
   `cvat-sdk` and `cvat-cli` source code
1. Install all necessary requirements before running REST API tests:
   ```shell
   pip install -r ./tests/python/requirements.txt
   ```
1. Version precheck is strict by default (except explicit `--infra down|restore-db`):
   - installed `cvat-sdk` and `cvat-cli` major.minor must match repository versions
   - if server is reachable, `/api/server/about` major.minor must match repository SDK version
   - otherwise on local platform, fallback check uses `cvat/server:${CVAT_VERSION:-dev}` major.minor
   If they differ, pytest exits before running tests.
   Use `--skip-version-check` to bypass this sanity check when needed.
1. Stop any other CVAT containers which you run previously. They keep ports
which are used by containers for the testing system.

**Running tests**

- Run all REST API tests:

  ```shell
  pytest ./tests/python
  ```

  This command will automatically start all necessary docker containers.
  See the [contributing guide](../../site/content/en/docs/contributing/running-tests.md)
  to get more information about tests running.

- Infrastructure lifecycle can be controlled explicitly:

  ```shell
  # Start infra for a dedicated compose project and exit
  pytest ./tests/python --run-prefix p1 up

  # Run tests against this running instance (state is reused automatically)
  pytest ./tests/python --run-prefix p1

  # Stop and remove the project infrastructure
  pytest ./tests/python --run-prefix p1 down

  # Restore DB from test assets and refresh test_db snapshot
  pytest ./tests/python --run-prefix p1 restore-db
  ```

  `restore-db` is a single-instance maintenance command and is not supported with `--parallel`.

- Parallel lanes:

  ```shell
  # Run with 4 local parallel lanes
  pytest ./tests/python --parallel 4

  # Explicitly manage infra lifecycle for the same parallel run-prefix
  pytest ./tests/python --run-prefix p1 --parallel 4 up
  pytest ./tests/python --run-prefix p1 --parallel 4
  pytest ./tests/python --run-prefix p1 --parallel 4 down
  ```

- Kubernetes lifecycle (`--platform kube`):

  Prerequisites: `minikube`, `kubectl`, `helm`, and Docker installed on the host.
  On macOS, for example:

  ```shell
  brew install minikube kubectl helm
  ```

  ```shell
  # Start minikube cluster (if needed), load images, deploy CVAT via Helm, wait for readiness
  pytest ./tests/python --platform kube --run-prefix k1 \
    --kube-cpus 8 --kube-memory 16g up

  # Run tests against the same kube release (runtime port-forwards are handled automatically)
  pytest ./tests/python --platform kube --run-prefix k1

  # Tear down Helm release and delete the minikube cluster
  pytest ./tests/python --platform kube --run-prefix k1 down
  ```

  Notes:
  - Test runs do not build images automatically (local and kube).
    Build explicitly with `pytest ./tests/python --infra build-images`.
  - Images are configured with `--kube-server-image`, `--kube-frontend-image`, `--kube-image-tag`.
  - `--kube-cpus` and `--kube-memory` are passed to `minikube start`.
  - The first run is slower because minikube base images/charts and service images are pulled/loaded.
  - `--cleanup/--dumpdb` are local-only helpers and are not supported with `--platform kube`.

- Lane profiles are selected automatically by the scheduler based on collected
  tests and `@pytest.mark.infra_profile("simple|standard|full")`.

- macOS benchmark runs:

  For stable and repeatable benchmark numbers on laptops, prevent sleep during the run:

  ```shell
  caffeinate -d -i -m -s ./run_benchmark.sh
  ```

  This affects only the wrapped command runtime and does not require changing system power settings.

- Reusing running lanes with different profiles:
  Existing stacks are reused when possible. If configuration is incompatible,
  the runner recreates the affected instances automatically.

- Short aliases are supported for convenience:

  ```shell
  pytest ./tests/python --run-prefix p1 up
  pytest ./tests/python --run-prefix p1 down
  pytest ./tests/python --run-prefix p1 restore-db
  ```

- Defaults:
  - `pytest ./tests/python` uses `--run-prefix test`, `--platform local`, `--infra auto`.
  - `--parallel` accepts a positive integer (`--parallel 2`, `--parallel 4`, ...).
  - `--parallel 1` behaves like a regular single-process run.

## How to upgrade testing assets?

When you have a new use case which cannot be expressed using objects already
available in the system like comments, users, issues, please use the following
procedure to add them:

1. Run a clean CVAT instance and restore DB and data volume
   ```console
   pytest tests/python/ up
   ```
1. Add new objects (e.g. issues, comments, tasks, projects)
1. Backup DB and data volume using commands below
1. Don't forget to dump new objects into corresponding json files inside
   assets directory
1. Commit cvat_data.tar.bz2 and data.json into git. Be sure that they are
   small enough: ~300K together.

It is recommended to use dummy and tiny images. You can generate them using
Pillow library. See a sample code below:

```python
from PIL import Image
from PIL.ImageColor import colormap, getrgb
from random import randint


for i, color in enumerate(colormap):
    size = (randint(100, 1000), randint(100, 1000))
    img = Image.new('RGB', size, getrgb(color))
    img.save(f'{i}.png')
```

## How to backup DB and data volume?

To backup DB and data volume, please use commands below.

```console
cd tests/python
docker exec test_cvat_server_1 python manage.py dumpdata --indent 2 --natural-foreign \
    --exclude=admin --exclude=auth.permission --exclude=authtoken --exclude=contenttypes \
    --exclude=django_rq --exclude=sessions \
    > shared/assets/cvat_db/data.json
docker exec test_cvat_server_1 tar --exclude "/home/django/data/cache" -cjv /home/django/data > shared/assets/cvat_db/cvat_data.tar.bz2
```

> Note: if you won't be use --indent options or will be use with other value
> it potentially will lead to problems with merging of this file with other branch.

## How to update *.json files in the assets directory?

If you have updated the test database and want to update the assets/*.json
files as well, run the appropriate script:

```
cd tests/python
pytest ./ up
python shared/utils/dump_objects.py
```

## How to restore DB and data volume?

To restore DB and data volume, please use commands below.

```console
cat shared/assets/cvat_db/data.json | docker exec -i test_cvat_server_1 python manage.py loaddata --format=json -
cat shared/assets/cvat_db/cvat_data.tar.bz2 | docker exec -i test_cvat_server_1 tar --strip 3 -C /home/django/data/ -xj
```

## Assets directory structure

Assets directory has two parts:

- `cvat_db` directory --- this directory contains all necessary files for
  successful restoring of test db
  - `cvat_data.tar.bz2` --- archive with data volumes;
  - `data.json` --- file required for DB restoring.
    Contains all information about test db.
- `*.json` files --- these file contains all necessary data for getting
  expected results from HTTP responses

## FAQ

1. How to merge two DB dumps?

   In common case it should be easy just to merge two JSON files.
   But in the case when a simple merge fails, you have to first merge
   the branches, then re-create the changes that you made.

1. How to upgrade cvat_data.tar.bz2 and data.json?

   After every commit which changes the layout of DB and data directory it is
   possible to break these files. But failed tests should be a clear indicator
   of that.

1. Should we use only json files to re-create all objects in the testing
   system?

   Construction of some objects can be complex and takes time (backup
   and restore should be much faster). Construction of objects in UI is more
   intuitive.

1. How we solve the problem of dependent tests?

   Since some tests change the database, these tests may be dependent on each
   other, so in current implementation we avoid such problem by restoring
   the database after each test function (see `conftest.py`)

1. Which user should be selected to create new resources in test DB?

   If for your test it's no matter what user should send a request,
   then better to choose `admin1` user for creating new resource.

## Troubleshooting

1. If your tests was failed due to date field incompatibility and you have
   error message like this:
   ```
   assert {'values_chan...34.908528Z'}}} == {}
   E                 Left contains 1 more item:
   E                 {'values_changed': {"root['results'][0]['updated_date']": {'new_value': '2022-03-05T08:52:34.908000Z',
   E                                                                            'old_value': '2022-03-05T08:52:34.908528Z'}}}
   E                 Use -v to get the full diff
   ```
   Just dump JSON assets with:
   ```
   python3 tests/python/shared/utils/dump_objects.py
   ```

1. If your test infrastructure has been corrupted and you have DB restore errors,
   reset DB state from test assets:
   ```
   pytest tests/python --run-prefix test restore-db
   ```

1. Perform migrate when some relation does not exists. Example of error message:
   ```
   django.db.utils.ProgrammingError: Problem installing fixture '/data.json': Could not load admin.LogEntry(pk=1): relation "django_admin_log" does not exist`
   ```
   Solution:
   ```
   docker exec test_cvat_server_1 python manage.py migrate
   ```

1. If you get errors related to active DB connections or partial DB state,
   do not run manual SQL commands. Use:
   ```
   pytest tests/python --run-prefix test restore-db
   ```
