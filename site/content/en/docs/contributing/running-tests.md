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
   ```bash
   cd tests
   yarn --immutable
   ```

If you want to get a code coverage report, instrument the code:
```bash
yarn --immutable
yarn run coverage
```

**Running tests**

```bash
yarn run cypress:run:chrome
yarn run cypress:run:chrome:canvas3d
```

# REST API, SDK and CLI tests

**Initial steps**

1. Follow {{< ilink "/docs/api_sdk/sdk/developer-guide" "this guide" >}} to prepare
   `cvat-sdk` and `cvat-cli` source code
1. Install all necessary requirements before running REST API tests:
   ```bash
   pip install -e ./cvat-sdk -e ./cvat-cli -r ./tests/python/requirements.txt
   ```
1. Stop any other CVAT containers which you run previously. They keep ports
which are used by containers for the testing system.

**Running tests**

Run all REST API tests:

```bash
pytest ./tests/python
```

This command will automatically start all necessary docker containers.

If you want explicit infrastructure lifecycle control, use project-scoped runs:

```bash
# Start infra for a dedicated compose project and exit
pytest ./tests/python --run-prefix p1 --infra up

# Run tests against the same running stack
pytest ./tests/python --run-prefix p1

# Stop and remove that stack
pytest ./tests/python --run-prefix p1 --infra down

# Restore DB from test assets and refresh test_db snapshot
pytest ./tests/python --run-prefix p1 --infra restore-db
```

You can also use shorthand aliases:

```bash
pytest ./tests/python --run-prefix p1 up
pytest ./tests/python --run-prefix p1 down
pytest ./tests/python --run-prefix p1 restore-db
```

`restore-db` is single-instance only and is not supported with `--parallel`.

Kubernetes lifecycle (`--platform kube`):

Prerequisites on host: `kind`, `kubectl`, `helm`, Docker.
On macOS, for example:

```bash
brew install kind kubectl helm
```

```bash
# Start kind cluster (if needed), load images, deploy CVAT with Helm, wait for readiness
pytest ./tests/python --platform kube --run-prefix k1 \
  --kube-cpus 8 --kube-memory 16g up

# Run tests against the same release (runtime port-forwards are handled by pytest)
pytest ./tests/python --platform kube --run-prefix k1

# Stop and cleanup (Helm release + kind cluster)
pytest ./tests/python --platform kube --run-prefix k1 down
```

Notes:
- Kube mode does not build images automatically.
- Use `--kube-server-image`, `--kube-frontend-image`, `--kube-image-tag` to point Helm to desired images.
- `--kube-cpus` and `--kube-memory` set resource limits on kind node containers via `docker update`.
- The first run is slower because Kind node images/charts and service images are pulled/loaded.
- `--rebuild`, `--cleanup`, `--dumpdb` are local-only and not supported with `--platform kube`.

Profile-based runs:

```bash
# core: base services + key workers (annotation, chunks, import, export)
pytest ./tests/python --run-prefix p1 --infra-profile core --infra up

# extended: core + worker services
pytest ./tests/python --run-prefix p2 --infra-profile extended --infra up
```

Parallel lanes:

```bash
pytest ./tests/python --parallel core,extended,full
pytest ./tests/python --parallel core*4
pytest ./tests/python --parallel core*3,full
```

For shells that expand `*` (e.g. `zsh`), quote the argument:
```bash
pytest ./tests/python --parallel 'core*4'
```

Profile mismatch handling for `up`:
```bash
# default: fail fast if a lane profile differs from saved state
pytest ./tests/python --run-prefix p1 --parallel core,core,full,core up

# recreate only mismatched lanes
pytest ./tests/python --run-prefix p1 --parallel core,core,full,core up \
  --parallel-profile-mismatch=replace
```

Profile routing is automatic:
- `infra_profile("full")` tests run in `full`
- worker-dependent modules (task data/import/export/upload paths) run in `extended`
- the rest run in `core`
- you can override with `@pytest.mark.infra_profile("core|extended|full")`

If you need to rebuild CVAT images without running tests:
```bash
pytest ./tests/python --rebuild
```

If you want to rebuild and then start containers:
```bash
pytest ./tests/python --infra up --rebuild
```

If you want to get a code coverage report:
```bash
COVERAGE_PROCESS_START=.coveragerc pytest ./tests/python --cov --cov-report xml
```

**Debugging**
Docker-compose based debugging flow:

1. Start infrastructure for a dedicated run:
   ```bash
   pytest tests/python --run-prefix dbg up
   ```
1. Reproduce only the failing test(s) by node id or `-k`:
   ```bash
   pytest tests/python/rest_api/test_tasks.py::TestTaskBackups::test_can_export_backup \
     --run-prefix dbg -vv -s
   pytest tests/python/rest_api/test_tasks.py -k "<failing_test_name>" --run-prefix dbg -vv -s
   ```
1. Stop on first failure and open an interactive debugger with local variables:
   ```bash
   pytest tests/python/rest_api/test_tasks.py::TestTaskBackups::test_can_export_backup \
     --run-prefix dbg -x --maxfail=1 --pdb -vv -s
   ```
1. Set breakpoints before a failure:
   ```python
   breakpoint()
   ```
   Then run the same command as above (no extra flags are required for `breakpoint()`).
1. Enter debugger at test start (before test body executes):
   ```bash
   pytest tests/python/rest_api/test_tasks.py::TestTaskBackups::test_can_export_backup \
     --run-prefix dbg --trace -vv -s
   ```
1. Inspect server/worker logs:
   ```bash
   docker logs dbg_cvat_server_1 --tail=200
   docker logs dbg_cvat_worker_annotation_1 --tail=200
   docker logs dbg_cvat_worker_chunks_1 --tail=200
   ```
1. Open a shell in the container if needed:
   ```bash
   docker exec -it dbg_cvat_server_1 /bin/bash
   ```
1. Debug recommendation for parallel runs:
   Run the failing test without `--parallel` when using `--pdb`/`--trace`. Interactive debugging is most reliable in a single pytest process.
1. Stop and cleanup:
   ```bash
   pytest tests/python --run-prefix dbg down
   ```

Debugging by use case:

### Debug a failed test

1. Start dedicated infra:
   ```bash
   pytest tests/python --run-prefix dbg up
   ```
1. Reproduce the exact failing test:
   ```bash
   pytest tests/python/rest_api/test_tasks.py::TestTaskBackups::test_can_export_backup \
     --run-prefix dbg -vv -s
   ```
1. Rerun with automatic debugger on failure:
   ```bash
   pytest tests/python/rest_api/test_tasks.py::TestTaskBackups::test_can_export_backup \
     --run-prefix dbg -x --maxfail=1 --pdb -vv -s
   ```
1. In `pdb`, inspect and navigate:
   ```text
   p var_name
   pp object_name
   where
   up
   down
   n
   s
   c
   ```
1. Cleanup:
   ```bash
   pytest tests/python --run-prefix dbg down
   ```

### Debug a non-failed test

1. Start dedicated infra:
   ```bash
   pytest tests/python --run-prefix dbg up
   ```
1. Option A: enter debugger at test start:
   ```bash
   pytest tests/python/rest_api/test_tasks.py::TestTaskBackups::test_can_export_backup \
     --run-prefix dbg --trace -vv -s
   ```
1. Option C: VS Code attach flow for pytest process (wait before test execution):
   ```bash
   pytest tests/python/rest_api/test_tasks.py::TestTaskBackups::test_can_export_backup \
     --run-prefix dbg --vscode -vv -s
   ```
   Requirement: `debugpy` must be installed in the active Python environment.
   ```bash
   pip install debugpy
   ```
   This opens VS Code (if `code` is in `PATH`) and waits for debugger attach.
   In VS Code select launch target `local: attach pytest (waiting)` and start debugging.
   `--vscode` is intended for single-process runs (without `--parallel`).
1. Option D: VS Code attach flow for CVAT server/worker code in containers:
   ```bash
   pytest tests/python/rest_api/test_tasks.py::TestTaskBackups::test_can_export_backup \
     --run-prefix dbg --container-debug server,worker_annotation --container-debug-wait --vscode -vv -s
   ```
   Pytest generates `.vscode/tests-debug.code-workspace` with the exact attach targets/ports
   and opens it via `code -r ...`.
   In VS Code use:
   - `local: attach pytest (waiting)` (always first)
   - `tests: attach all enabled containers` (or individual generated container targets)
1. Option B: stop at a specific line:
   - add `breakpoint()` in test code or application code;
   - run the same test normally:
   ```bash
   pytest tests/python/rest_api/test_tasks.py::TestTaskBackups::test_can_export_backup \
     --run-prefix dbg -vv -s
   ```
1. Cleanup:
   ```bash
   pytest tests/python --run-prefix dbg down
   ```

### VS Code debug profiles

The repository includes base launch profiles in `.vscode/launch.json`:
- `server: REST API tests`
- `sdk: tests`
- `cli: tests`
- `local: attach pytest (waiting)` (for `pytest --vscode`)

For container debugging with dynamic ports/services, use generated
`.vscode/tests-debug.code-workspace` (created by `--vscode`).

How to use them for Python tests:

1. Open **Run and Debug** in VS Code.
1. Select one of the profiles above.
1. For infra-isolated debugging, edit that profile `args` and add:
   ```json
   "--run-prefix", "dbg"
   ```
1. If needed, force profile explicitly:
   ```json
   "--infra-profile", "core"
   ```
   or
   ```json
   "--infra-profile", "extended"
   ```
   or
   ```json
   "--infra-profile", "full"
   ```
1. For debugger on failure, add:
   ```json
   "-x", "--maxfail=1", "--pdb", "-s", "-vv"
   ```
1. To debug one test, replace directory argument with a node id:
   ```json
   "tests/python/rest_api/test_tasks.py::TestTaskBackups::test_can_export_backup"
   ```

Example `args` for `server: REST API tests`:
```json
[
  "--verbose",
  "--no-cov",
  "-x",
  "--maxfail=1",
  "--pdb",
  "-s",
  "--run-prefix",
  "dbg",
  "tests/python/rest_api/test_tasks.py::TestTaskBackups::test_can_export_backup"
]
```

If you need a different attach port:
- run pytest with `--vscode-port <port>`
- duplicate `local: attach pytest (waiting)` and update its `connect.port` to the same value.
- for container-side attach, use `--container-debug-port-base <port>`.

If attach fails with `ECONNREFUSED` or the port is busy:
- check whether something else already uses the port:
  ```bash
  lsof -i :5678
  ```
- choose another port and use it in both places:
  ```bash
  pytest tests/python/rest_api/test_tasks.py::TestTaskBackups::test_can_export_backup \
    --run-prefix dbg --vscode --vscode-port 5680 -vv -s
  ```
  and in VS Code set `connect.port` to `5680`.
- for container-side debugging:
  ```bash
  pytest tests/python/rest_api/test_tasks.py::TestTaskBackups::test_can_export_backup \
    --run-prefix dbg --container-debug server --container-debug-wait --container-debug-port-base 39190 --vscode -vv -s
  ```


# Server unit tests

**Initial steps**
1. If you run unit tests on Linux, ensure that `poppler-utils` and `unrar` are installed on your system:
   ```bash
   sudo apt-get update
   sudo apt-get install -y poppler-utils unrar
   ```
1. Install necessary Python dependencies:
   ```bash
   pip install -r cvat/requirements/testing.txt
   ```
1. Build CVAT server image
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml build cvat_server
   ```
1. Run cvat_opa container
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d cvat_opa
   ```

**Running tests**
1. Python tests
   ```bash
   python manage.py test --settings cvat.settings.testing cvat/apps -v 2
   ```

If you want to get a code coverage report, run the next command:
   ```bash
   coverage run manage.py test --settings cvat.settings.testing cvat/apps -v 2
   ```

**Debugging**
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
