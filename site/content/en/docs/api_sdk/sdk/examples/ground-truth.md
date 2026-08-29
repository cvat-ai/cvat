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
