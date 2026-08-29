---
title: 'Dataset recipes'
linkTitle: 'Datasets'
weight: 7
description: 'Download only what changed, and export many tasks in one run'
---

Two recipes for getting datasets out of CVAT at scale:
`dataset_incremental_download.py` re-exports only the tasks that changed since
its previous run, and `dataset_bulk_export.py` exports a whole selection of
tasks in one go, with a manifest and resume. For exporting a single project's
tasks locally and to a bucket, see
[`project_export_dataset.py`](../projects#export-a-projects-tasks-as-datasets).

## Download only what changed

Keeps a small JSON state file next to the exports. On each run it asks the
server for the project's tasks updated after the previous run — the
`updated_date__gt` keyword becomes a server-side filter — exports only those,
and records each task's `updated_date` immediately after its export succeeds,
so an interrupted run resumes instead of starting over. Tasks that vanished
from the server are reported, not silently forgotten.

| Flag | Required | Meaning |
| --- | --- | --- |
| `--host` | yes | Server URL |
| `--token` | yes | Personal Access Token |
| `--project-id` | yes | Id of the project to track |
| `--state` | no | State file (default `incremental_state.json`) |
| `--output-dir` | no | Where the exports go (default `datasets`) |
| `--export-format` | no | Exporter name (default `'COCO 1.0'`) |
| `--with-images` | no | Include images — much larger and slower |

```bash
python dataset_incremental_download.py --host 'https://app.cvat.ai' --token '<your token>' \
    --project-id 7 --output-dir datasets
```

### The script

{{< include-code "assets/sdk-examples/dataset_incremental_download.py" >}}
