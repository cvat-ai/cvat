# CVAT SDK examples

Small, copy-pasteable examples for the CVAT Python SDK, grouped by domain area. Each function takes
an already-authenticated `client`, so you can lift a single function straight into your own code.

## Running

Set two environment variables and run any module directly:

    export CVAT_HOST=https://app.cvat.ai
    export CVAT_ACCESS_TOKEN=<your personal access token>
    python -m examples.task_management

Create a token in the CVAT UI under Profile -> Security.

## Modules

- `authentication.py` - build an authenticated client (token, profile, password fallback)
- `project_management.py` - create/list/update/delete projects, backup/restore, CSV status report, export a project dataset
- `task_management.py` - create tasks from local files and from cloud storage, list/filter, inspect, export a task dataset
- `job_management.py` - list/filter/search jobs, update stage/state, round-robin auto-assignment, import annotations
- `cloud_storage.py` - register/list/retrieve/update/delete an S3-compatible cloud storage (register is used by the dataset export and task-from-cloud helpers)

These examples are exercised in CI (`tests/python/sdk/test_examples.py`), so they stay in sync with
the SDK.
