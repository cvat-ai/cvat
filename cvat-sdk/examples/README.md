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
| `project_find_duplicates.py` | Find objects annotated twice: objects on the same frame with the same label, shape type, and coordinates | `--project-id`, `--task-id`, `--any-label`, `--output`, `--no-fail` |
| `project_backup.py` | Download a backup zip of an existing project | `--project-id`, `--output` |
| `project_restore.py` | Restore a project from a backup zip | `--backup`, `--cleanup` |
| `project_export_dataset.py` | Export a project's tasks individually (all, or a `--task-id` list), locally and to a bucket | `--project-id`, `--cloud-storage-id`, `--export-format`, `--task-id` (optional, space-separated) |
| `dataset_incremental_download.py` | Keep a local cache of a project's task data, re-downloading only the tasks the server has changed | `--project-id`, `--task-id`, `--cache-dir`, `--offline`, `--quiet` |
| `dataset_bulk_export.py` | Export many tasks at once, locally and/or to a bucket | `--task-id` (space-separated), `--status`, `--output-dir`, `--cloud-storage-id`, `--skip-existing` |
| `task_create_from_cloud.py` | Create a task from bucket object keys | `--cloud-storage-id`, `--cloud-keys`, `--cleanup` |
| `tasks_bulk_from_cloud.py` | Bulk-create tasks in a project, from bucket object keys or wildcard patterns | `--cloud-storage-id`, `--project-id`, `--task` (repeat), `--task-pattern` (repeat), `--manifest`, `--cleanup` |
| `tasks_create_per_label_group.py` | Create one task per shape type / label group over the same images | `--image-dir`, `--task` (repeat), `--segment-size`, `--cleanup` |
| `task_create_job_mapping.py` | Create a task with an explicit file-to-job mapping and verify it from the server | `--image-dir`, `--job` (repeat) or `--files-per-job`, `--output`, `--cleanup` |
| `task_inspect_and_export.py` | Inspect a task; export its dataset and event-log analytics | `--task-id`, `--export-format` |
| `task_import_annotations.py` | Import an annotations file into an existing task | `--task-id`, `--annotations-file`, `--import-format` |
| `task_import_annotations_from_cloud.py` | Import an annotations file into an existing task directly from a registered cloud storage | `--task-id`, `--filename`, `--cloud-storage-id`, `--import-format`, `--import-mode` |
| `task_edit_annotations.py` | Bulk-edit a task's annotations: relabel or delete objects by label | `--task-id`, `--relabel` or `--delete-label` |
| `task_create_with_validation.py` | Create a task with a ground truth validation set and upload the ground truth into it | `--image-dir`, `--gt-frame` or `--gt-frame-count`, `--gt-annotations`, `--gt-format`, `--cleanup` |
| `task_create_with_honeypots.py` | Create a task whose annotation jobs carry ground truth frames | `--image-dir`, `--honeypot-frame` or `--honeypot-frame-count`, `--honeypots-per-job`, `--cleanup` |
| `task_create_gt_job.py` | Create a ground truth job with an exact frame list in an existing task | `--task-id`, `--frame` or `--frame-name`, `--replace` |
| `job_list.py` | List a task's or project's jobs with stage/state/assignee; optional CSV report | `--task-id` or `--project-id`, `--stage`, `--state`, `--csv` |
| `job_assign.py` | Round-robin assign unassigned jobs; CSV report | `--task-id`, `--org` or `--org-id`, `--assignees` or `--search` |
| `job_workflow.py` | Batch-advance completed jobs to the next stage | `--from-stage`, `--task-id` |
| `cloud_storage_register.py` | Attach an S3-compatible bucket to CVAT | `--bucket`, `--access-key`, `--secret-key`, `--endpoint-url`, `--page-size`, `--cleanup` |
| `register_webhook.py` | Register a project- or organization-scoped webhook, ping it, and summarize deliveries | `--project-id` or `--org`, `--target-url`, `--secret`, `--events`, `--content-type`, `--cleanup` |
| `webhook_resource_monitoring.py` | Receive webhook deliveries locally and tally `create:task` events | `--project-id`, `--public-url`, `--port`, `--secret`, `--max-events`, `--cleanup` |

Every recipe additionally takes `--host` and `--token`. Wrap values that
contain URL punctuation in single quotes, e.g. `--host 'https://app.cvat.ai'`.
