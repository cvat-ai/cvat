# CVAT SDK recipes

Complete, copy-and-run scripts for the CVAT Python SDK. Pick a recipe, set the
environment variables from its docstring, and run it:

    export CVAT_HOST=https://app.cvat.ai
    export CVAT_ACCESS_TOKEN=<your token>   # CVAT UI: Profile -> Security
    export IMAGE_DIR=./images
    python task_create_from_images.py

Conventions: recipes that create resources keep them (set `CVAT_EXAMPLES_CLEANUP=1`
to delete them at the end); recipes that inspect or export take an existing id via
`CVAT_PROJECT_ID` / `CVAT_TASK_ID`; list-valued variables are comma-separated.

| Recipe | What it does | Extra env vars |
| --- | --- | --- |
| `auth_connect.py` | Connect with a Personal Access Token, whoami | — |
| `auth_profiles.py` | Profile auth; deprecated password fallback | `CVAT_PROFILE` or `CVAT_USERNAME`+`CVAT_PASSWORD` |
| `project_create_and_list.py` | Create, list, filter, retrieve, rename a project | `CVAT_PROJECT_NAME`, `CVAT_LABELS` |
| `project_status_report.py` | CSV report of an existing project's tasks/jobs | `CVAT_PROJECT_ID` |
| `project_backup_restore.py` | Backup an existing project, restore as a copy | `CVAT_PROJECT_ID` |
| `project_export_dataset.py` | Export a project dataset locally and to a bucket | `CVAT_PROJECT_ID`, `CVAT_CLOUD_STORAGE_ID`, `CVAT_EXPORT_FORMAT` |
| `task_create_from_images.py` | Create a task from a folder of images | `IMAGE_DIR`, `CVAT_PROJECT_ID`, `CVAT_LABELS` |
| `task_create_from_cloud.py` | Create a task from bucket object keys | `CVAT_CLOUD_STORAGE_ID`, `CLOUD_KEYS` |
| `task_inspect_and_export.py` | Inspect a task; export locally and to a bucket | `CVAT_TASK_ID`, `CVAT_CLOUD_STORAGE_ID`, `CVAT_EXPORT_FORMAT` |
| `job_list_and_assign.py` | List a task's jobs; round-robin assignment | `CVAT_TASK_ID`, `CVAT_ASSIGNEE_IDS` |
| `job_workflow.py` | Import annotations into a job; advance its stage | `CVAT_TASK_ID`, `ANNOTATIONS_PATH`, `ANNOTATIONS_FORMAT` |
| `cloud_storage_register.py` | Attach an S3-compatible bucket to CVAT | `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_ENDPOINT_URL` |
