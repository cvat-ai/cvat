---
title: 'Recipes (examples)'
linkTitle: 'Recipes'
weight: 8
description: 'Complete, copy-and-run SDK scripts grouped by domain area'
---

Every example in this section is a **complete script** that uses `argparse`.
Pass `--help` to any script to see all options. The same files live in
[`cvat-sdk/examples/`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples).

Shared conventions:

- Every recipe takes `--host` and `--token`. Create a token in the CVAT UI under
  Profile -> Security. Wrap values that contain URL punctuation in single quotes,
  e.g. `--host 'https://app.cvat.ai'`. `auth_profile.py` and `auth_cli.py` show
  alternative sign-in flows.
- Recipes that create resources keep them and print their ids and UI links. Pass
  `--cleanup` to delete what the script created (never the sources it read).
- Recipes that inspect or export take an **existing** resource id
  (`--project-id`, `--task-id`), so they work directly against your data.
- List-valued options accept multiple values, e.g. `--labels car person`.
- Missing arguments exit with a friendly message; SDK errors surface as normal
  Python tracebacks.

All examples are tested in the latest SDK version.

## Topics

- [Authenticate](authentication) — `auth_token.py`, `auth_profile.py`, `auth_cli.py`
- [Projects](projects) — create/list, backup, restore, dataset export
- [Tasks](tasks) — create from a bucket, bulk-create in a project,
  inspect and export, subtasks by object type, explicit job file mapping
- [Jobs](jobs) — list jobs, round-robin assignment, batch-advance stages
- [Annotations](annotations) — import, bulk-edit, per-label statistics, linting
- [Ground truth](ground-truth) — validation sets, honeypots, specific ground truth frames
- [Datasets](datasets) — incremental download, bulk export
- [Cloud storage](cloud-storage) — attach an S3-compatible bucket
- [Webhooks](webhooks) — register and ping a webhook, receive deliveries locally
