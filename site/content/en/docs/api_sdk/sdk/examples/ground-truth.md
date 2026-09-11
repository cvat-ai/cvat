---
title: 'Ground truth recipes'
linkTitle: 'Ground truth'
weight: 6
description: 'Create validation sets and honeypots, and choose exactly which frames are ground truth'
---

Three recipes for the quality-control side of a task:
`task_create_with_validation.py` creates a task with a gold set and uploads the
ground truth into it, `task_create_with_honeypots.py` builds a task whose every
annotation job carries validation frames, and `task_add_gt_frames.py` adds a
ground truth job with an exact frame list to a task that already exists.

## Create a task with a gold set

Creates the task with `validation_params` in `gt` mode, so the validation
frames move into a separate ground truth job that annotators never see. Pick
the frames by name (`--validation-frame`) or let the server sample them
(`--frame-count`, reproducible with `--random-seed`). The recipe then uploads
`--gt-annotations` into that ground truth job and reports how many objects
landed — after this, quality reports can compare the annotation jobs against it.

The ground truth job's own frame list is padded with placeholder entries to
mirror the task's full frame range, so the recipe reads the real validation
frames from the task's validation layout instead of the job's frame list.

| Flag | Required | Meaning |
| --- | --- | --- |
| `--host` | yes | Server URL |
| `--token` | yes | Personal Access Token |
| `--image-dir` | yes | Directory with the task's images |
| `--validation-frame NAME [NAME ...]` | one of `--validation-frame` / `--frame-count` | Exact validation frames |
| `--frame-count N` | one of `--validation-frame` / `--frame-count` | Randomly sample N validation frames |
| `--random-seed` | no | Makes `--frame-count` reproducible |
| `--gt-annotations` | no | Annotations file to upload into the ground truth job |
| `--gt-format` | no | Importer name (default `'COCO 1.0'`) |
| `--name`, `--labels`, `--segment-size` | no | Task name, labels, frames per annotation job |
| `--cleanup` | no | Delete the created task at the end |

```bash
python task_create_with_validation.py --host 'https://app.cvat.ai' --token '<your token>' \
    --image-dir ./images --validation-frame 'img_001.png' 'img_042.png' \
    --gt-annotations ground_truth.zip --gt-format 'COCO 1.0'
```

### The script

{{< include-code "assets/sdk-examples/task_create_with_validation.py" >}}

## Create a task with honeypots

Creates the task with `validation_params` in `gt_pool` mode: a pool of ground
truth frames, `--honeypots-per-job` of which are mixed into every annotation
job. Then it prints the layout the server actually built — the pool, and per
job which honeypot frame stands in for which pool frame — so you can see what
the annotators will get. `--refresh` reshuffles that mapping (useful once
annotators start recognizing the honeypots), and `--disable-frame` retires a
pool frame whose ground truth turned out to be wrong.

Honeypots need an image task, not a video one. The pool is appended after the
task's own frames, so the task grows by the injected frames, and
`segment_size` reads back as `0`, which means "custom segments". `gt_pool`
also requires the task's frames to be laid out with `sorting_method: random`,
so annotators cannot learn "this position is always a honeypot" — the recipe
sets this automatically.

| Flag | Required | Meaning |
| --- | --- | --- |
| `--host` | yes | Server URL |
| `--token` | yes | Personal Access Token |
| `--image-dir` | yes | Directory with the task's images |
| `--pool-frame NAME [NAME ...]` | one of `--pool-frame` / `--pool-frame-count` | Exact pool frames |
| `--pool-frame-count N` | one of `--pool-frame` / `--pool-frame-count` | Randomly sample N pool frames |
| `--honeypots-per-job` | yes | Pool frames mixed into each annotation job |
| `--refresh` | no | Reshuffle which pool frames land in which job |
| `--disable-frame FRAME [FRAME ...]` | no | Retire pool frames by index |
| `--name`, `--labels`, `--segment-size` | no | Task name, labels, frames per annotation job |
| `--cleanup` | no | Delete the created task at the end |

```bash
python task_create_with_honeypots.py --host 'https://app.cvat.ai' --token '<your token>' \
    --image-dir ./images --pool-frame-count 20 --honeypots-per-job 2 --segment-size 50
```

### The script

{{< include-code "assets/sdk-examples/task_create_with_honeypots.py" >}}

## Choose exactly which frames are ground truth

Adds a ground truth job to a task that already exists, with the frames you
name — by index (`--frame`) or by file name (`--frame-name`, resolved through
the task's frame list). A task can hold one ground truth job, so the recipe
refuses to overwrite an existing one unless `--replace` is passed: deleting a
ground truth job discards its annotations. Afterwards it reads the task's
validation layout back, so the printed frame list is the server's.

| Flag | Required | Meaning |
| --- | --- | --- |
| `--host` | yes | Server URL |
| `--token` | yes | Personal Access Token |
| `--task-id` | yes | Id of the task to add the ground truth job to |
| `--frame N [N ...]` | one of `--frame` / `--frame-name` | Frame indexes |
| `--frame-name NAME [NAME ...]` | one of `--frame` / `--frame-name` | Frame file names |
| `--replace` | no | Delete an existing ground truth job first |
| `--cleanup` | no | Delete the created ground truth job at the end (never the task) |

```bash
python task_add_gt_frames.py --host 'https://app.cvat.ai' --token '<your token>' \
    --task-id 42 --frame 0 17 42
```

### The script

{{< include-code "assets/sdk-examples/task_add_gt_frames.py" >}}

_Other SDK options:_

| SDK method / parameter | What it adds |
| --- | --- |
| `validation_params={"mode": "gt", "frame_selection_method": "random_per_job", "frames_per_job_count": N}` | Sample validation frames per annotation job instead of task-wide. |
| `validation_params={..., "frame_share": 0.1}` / `"frames_per_job_share"` | Express the sample as a share instead of a count. |
| `JobWriteRequest(type="ground_truth", frame_selection_method="random_uniform", frame_count=N)` | Add a ground truth job with a random sample to an existing task. |
| `jobs_api.partial_update_validation_layout(job_id, ...)` | Change the honeypots of one annotation job instead of the whole task. |
| `tasks_api.retrieve_validation_layout(task_id)` | Read the pool, honeypots, and disabled frames at any time. |
| `Job.import_annotations(format_name, path)` | Upload ground truth into a ground truth job. |

_Notes:_

- `gt` mode moves the validation frames into a separate ground truth job;
  `gt_pool` mode copies pool frames into the annotation jobs. Only `gt_pool`
  makes annotators encounter validation frames while working.
- Validation frames are referenced by **file name** in `validation_params` and by
  **frame index** in `JobWriteRequest` and the validation layout API.
- Quality reports use whatever the ground truth job holds, so upload the ground
  truth before comparing.
- Full recipes:
  [`task_create_with_validation.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/task_create_with_validation.py),
  [`task_create_with_honeypots.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/task_create_with_honeypots.py),
  [`task_add_gt_frames.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/task_add_gt_frames.py).
