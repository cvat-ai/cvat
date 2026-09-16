---
title: 'Ground truth recipes'
linkTitle: 'Ground truth'
weight: 6
description: 'Create validation sets and honeypots, and choose exactly which frames are ground truth'
---

Three recipes for the quality-control side of a task:
`task_create_with_validation.py` creates a task with a gold set and uploads the
ground truth into it, `task_create_with_honeypots.py` builds a task whose every
annotation job carries ground truth frames, and `task_create_gt_job.py` creates
a ground truth job with an exact frame list in a task that already exists.

## Create a task with a gold set

Creates the task with `validation_params` in `gt` mode, so the validation
frames move into a separate ground truth job that annotators never see. Pick
the frames by name (`--gt-frame`) or let the server sample them
(`--gt-frame-count`, reproducible with `--random-seed`). The recipe then uploads
`--gt-annotations` into that ground truth job and reports how many objects
landed — after this, quality reports can compare the annotation jobs against it.

The ground truth job's own frame list is padded with placeholder entries to
mirror the task's full frame range, so the recipe reads the real validation
frames from the task's validation layout instead of the job's frame list.

| Flag | Required | Meaning |
| --- | --- | --- |
| `--host` | yes | Server URL |
| `--token` | yes | Personal Access Token |
| `--image-dir` | yes | Directory with the task's images; every file in it is uploaded |
| `--gt-frame NAME [NAME ...]` | one of `--gt-frame` / `--gt-frame-count` | Exact ground truth frames |
| `--gt-frame-count N` | one of `--gt-frame` / `--gt-frame-count` | Randomly sample N ground truth frames |
| `--random-seed` | no | Makes `--gt-frame-count` reproducible |
| `--gt-annotations` | no | Annotations file to upload into the ground truth job |
| `--gt-format` | no | Importer name (default `'COCO 1.0'`) |
| `--name`, `--labels`, `--segment-size` | no | Task name, labels, frames per annotation job |
| `--cleanup` | no | Delete the created task at the end |

```bash
python task_create_with_validation.py --host 'https://app.cvat.ai' --token '<your token>' \
    --image-dir ./images --gt-frame 'img_001.png' 'img_042.png' \
    --gt-annotations ground_truth.zip --gt-format 'COCO 1.0'
```

### The script

{{< include-code "assets/sdk-examples/task_create_with_validation.py" >}}

## Create a task with honeypots

Creates the task with `validation_params` in `gt_pool` mode: a validation pool
of ground truth frames, `--honeypots-per-job` of which are mixed into every
annotation job. Then it prints the layout the server actually built — the pool,
and per job which frame of the job stands in for which pool frame — so you can
see what the annotators will get.

Honeypots need an image task, not a video one. The pool is appended after the
task's own frames, so the task grows by the injected frames. Because the
resulting jobs no longer have a common length, CVAT stores the per-job frame
lists it built and the task's `segment_size` reads back as `0`. `gt_pool` also
requires the task's frames to be laid out with `sorting_method: random`, so
annotators cannot learn "this position is always a honeypot" — the recipe sets
this automatically.

To reshuffle the mapping later (useful once annotators start recognizing the
honeypots) or to retire a pool frame whose ground truth turned out to be wrong,
call `tasks_api.partial_update_validation_layout()` with
`frame_selection_method="random_uniform"` or with `disabled_frames=[...]`.

| Flag | Required | Meaning |
| --- | --- | --- |
| `--host` | yes | Server URL |
| `--token` | yes | Personal Access Token |
| `--image-dir` | yes | Directory with the task's images; every file in it is uploaded |
| `--honeypot-frame NAME [NAME ...]` | one of `--honeypot-frame` / `--honeypot-frame-count` | Exact honeypot frames |
| `--honeypot-frame-count N` | one of `--honeypot-frame` / `--honeypot-frame-count` | Randomly sample N honeypot frames |
| `--honeypots-per-job` | yes | Honeypot frames mixed into each annotation job |
| `--name`, `--labels`, `--segment-size` | no | Task name, labels, frames per annotation job |
| `--cleanup` | no | Delete the created task at the end |

```bash
python task_create_with_honeypots.py --host 'https://app.cvat.ai' --token '<your token>' \
    --image-dir ./images --honeypot-frame-count 20 --honeypots-per-job 2 --segment-size 50
```

### The script

{{< include-code "assets/sdk-examples/task_create_with_honeypots.py" >}}

## Choose exactly which frames are ground truth

Creates a ground truth job in a task that already exists, with the frames you
name — by index (`--frame`) or by file name (`--frame-name`, resolved through
the task's frame list). A task can hold one ground truth job, so the recipe
refuses to overwrite an existing one unless `--replace` is passed: deleting a
ground truth job discards its annotations. Afterwards it reads the task's
validation layout back, so the printed frame list is the server's.

| Flag | Required | Meaning |
| --- | --- | --- |
| `--host` | yes | Server URL |
| `--token` | yes | Personal Access Token |
| `--task-id` | yes | Id of the task to create the ground truth job in |
| `--frame N [N ...]` | one of `--frame` / `--frame-name` | Frame indexes |
| `--frame-name NAME [NAME ...]` | one of `--frame` / `--frame-name` | Frame file names |
| `--replace` | no | Delete an existing ground truth job first |

```bash
python task_create_gt_job.py --host 'https://app.cvat.ai' --token '<your token>' \
    --task-id 42 --frame 0 17 42
```

### The script

{{< include-code "assets/sdk-examples/task_create_gt_job.py" >}}

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

- `gt` mode moves the ground truth frames into a separate ground truth job;
  `gt_pool` mode copies pool frames into the annotation jobs. Only `gt_pool`
  makes annotators encounter ground truth frames while working.
- Ground truth frames are referenced by **file name** in `validation_params` and by
  **frame index** in `JobWriteRequest` and the validation layout API.
- Quality reports use whatever the ground truth job holds, so upload the ground
  truth before comparing.
- Full recipes:
  [`task_create_with_validation.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/task_create_with_validation.py),
  [`task_create_with_honeypots.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/task_create_with_honeypots.py),
  [`task_create_gt_job.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/task_create_gt_job.py).
