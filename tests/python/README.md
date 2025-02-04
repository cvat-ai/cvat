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

- Run tests to check the functionality of limiting active jobs in a queue per user:

  ```shell
  ONE_RUNNING_JOB_IN_QUEUE_PER_USER="true" pytest tests/python/rest_api/test_queues.py
  ```
## How to upgrade testing assets?

When you have a new use case which cannot be expressed using objects already
available in the system like comments, users, issues, please use the following
procedure to add them:

1. Run a clean CVAT instance and restore DB and data volume
   ```console
   pytest tests/python/ --start-services
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
docker exec test_cvat_server_1 python manage.py dumpdata --indent 2 --natural-foreign --exclude=auth.permission --exclude=contenttypes --exclude=django_rq > shared/assets/cvat_db/data.json
docker exec test_cvat_server_1 tar --exclude "/home/django/data/cache" -cjv /home/django/data > shared/assets/cvat_db/cvat_data.tar.bz2
```

> Note: if you won't be use --indent options or will be use with other value
> it potentially will lead to problems with merging of this file with other branch.

## How to update *.json files in the assets directory?

If you have updated the test database and want to update the assets/*.json
files as well, run the appropriate script:

```
cd tests/python
pytest ./ --start-services
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
  - `cvat_data.tar.bz2` --- archieve with data volumes;
  - `data.json` --- file required for DB restoring.
    Contains all information about test db;
  - `restore.sql` --- SQL script for creating copy of database and
  killing connection for `cvat` database.
  Script should be run with varialbe declaration:
  ```
  # create database <new> with template <existing>
  psql -U root -d postgres -v from=<existing> -v to=<new> restore.sql
  ```
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

1. If your test session was exit with message:
   ```
   _pytest.outcomes.Exit: Command failed: ... Add `-s` option to see more details.
   ```
   Rerun tests to see error messages:
   ```
   pytest ./tests/python/rest_api -s
   ```

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

1. If your test infrastructure has been corrupted and you have errors during db restoring.
   You should to create (or recreate) `cvat` database:
   ```
   docker exec test_cvat_db_1 dropdb --if-exists cvat
   docker exec test_cvat_db_1 createdb cvat
   docker exec test_cvat_server_1 python manage.py migrate
   ```

1. Perform migrate when some relation does not exists. Example of error message:
   ```
   django.db.utils.ProgrammingError: Problem installing fixture '/data.json': Could not load admin.LogEntry(pk=1): relation "django_admin_log" does not exist`
   ```
   Solution:
   ```
   docker exec test_cvat_server_1 python manage.py migrate
   ```

1. If for some reason you need to recreate cvat database, but using `dropdb`
   you have error message:
   ```
   ERROR:  database "cvat" is being accessed by other users
   DETAIL:  There are 1 other session(s) using the database.
   ```
   In this case you should terminate all existent connections for cvat database,
   you can perform it with command:
   ```
   docker exec test_cvat_db_1 psql -U root -d postgres -v from=cvat_server -v to=test_db -f restore.sql
   ```
