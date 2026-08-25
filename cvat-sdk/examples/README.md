# CVAT SDK Examples

Complete, copy-and-run examples for the CVAT Python SDK. Each example is a command-line script.
Invoke a script with the `--help` parameter to see all its options. Example:

```sh
python tasks_bulk_from_cloud.py --help
python tasks_bulk_from_cloud.py \
    --host 'https://app.cvat.ai' \
    --token '<your token>' \
    --cloud-storage-id 7 --project-id 42 \
    --task 'videos/clip_01.mp4' \
    --task 'videos/clip_02.mp4'
```

Most of the examples use Personal Access Tokens for user authentication. You'll need to create one
to run a script, the instructions are available [here](https://docs.cvat.ai/docs/api_sdk/access_tokens/).

Conventions:
- examples that create resources keep them by default. Pass `--cleanup` to delete them at the end
- examples that operate with existing server objects take an id
  as the parameter (e.g. `--project-id`)
- list-valued options accept multiple values (e.g. `--labels car person`)

| Example | What it does | Parameters |
| --- | --- | --- |
| `auth_token.py` | Authenticate with a Personal Access Token, get current user | — |
| `auth_profile.py` | Authenticate from a saved profile | `--profile` (omit for the default profile) |
| `auth_cli.py` | Build a CLI-compatible script via `make_client_from_cli` | reuses cvat-cli's [flags](https://docs.cvat.ai/docs/api_sdk/cli/#authentication): `--server-host`, `--auth`, `--profile`, ... |
| `project_create_and_list.py` | Create, list, filter, retrieve, rename a project | `--name`, `--labels`, `--cleanup` |
| `project_add_labels.py` | Add labels (optionally with attributes) to an existing project | `--project-id`, `--labels`, `--attr` (repeat) |
| `project_annotation_stats.py` | Aggregate object counts per label/type across a project's tasks; CSV report | `--project-id` |
| `project_backup.py` | Download a backup zip of an existing project | `--project-id`, `--output` |
| `project_restore.py` | Restore a project from a backup zip | `--backup`, `--cleanup` |
| `project_export_dataset.py` | Export a project's tasks individually (all, or a `--task-id` list), locally and to a bucket | `--project-id`, `--cloud-storage-id`, `--export-format`, `--task-id` (optional, space-separated) |
| `task_create_from_cloud.py` | Create a task from bucket object keys | `--cloud-storage-id`, `--cloud-keys`, `--cleanup` |
| `tasks_bulk_from_cloud.py` | Bulk-create tasks in a project, from bucket object keys or wildcard patterns | `--cloud-storage-id`, `--project-id`, `--task` (repeat), `--task-pattern` (repeat), `--manifest`, `--cleanup` |
| `task_inspect_and_export.py` | Inspect a task; export its dataset and event-log analytics | `--task-id`, `--export-format` |
| `task_import_annotations.py` | Import an annotations file into an existing task | `--task-id`, `--annotations-file`, `--import-format` |
| `task_edit_annotations.py` | Bulk-edit a task's annotations: relabel or delete objects by label | `--task-id`, `--relabel` or `--delete-label` |
| `job_list.py` | List a task's or project's jobs with stage/state/assignee; optional CSV report | `--task-id` or `--project-id`, `--stage`, `--state`, `--csv` |
| `job_assign.py` | Round-robin assign unassigned jobs; CSV report | `--task-id`, `--org` or `--org-id`, `--assignees` or `--search` |
| `job_workflow.py` | Batch-advance completed jobs to the next stage | `--from-stage`, `--task-id` |
| `cloud_storage_register.py` | Attach an S3-compatible bucket to CVAT | `--bucket`, `--access-key`, `--secret-key`, `--endpoint-url`, `--page-size`, `--cleanup` |
| `webhook_register.py` | Register a webhook for task events; ping it and summarize deliveries | `--project-id` or `--org`, `--target-url`, `--secret`, `--events`, `--cleanup` |
| `webhook_monitor.py` | Receive webhook deliveries locally and aggregate task status changes | `--project-id`, `--public-url`, `--port`, `--secret`, `--max-events`, `--cleanup` |

Every recipe additionally takes `--host` and `--token`. Wrap values that
contain URL punctuation in single quotes, e.g. `--host 'https://app.cvat.ai'`.
