---
title: 'Recipes (examples)'
linkTitle: 'Recipes'
weight: 8
description: 'Complete, copy-and-run SDK scripts grouped by domain area'
---

Every example in this section is a **complete script**: copy it, set the environment
variables listed in its table, and run it. The same files live in
[`cvat-sdk/examples/`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples).

Shared conventions:

- `CVAT_HOST` and `CVAT_ACCESS_TOKEN` are required by every recipe (create a token in
  the CVAT UI under Profile -> Security). `auth_profiles.py` shows the alternatives.
- Recipes that create resources keep them and print their IDs and UI links; set
  `CVAT_EXAMPLES_CLEANUP=1` to have the script delete what it created.
- Recipes that inspect or export take an **existing** resource id
  (`CVAT_PROJECT_ID`, `CVAT_TASK_ID`), so they work directly against your data.
- List-valued variables (`CLOUD_KEYS`, `CVAT_ASSIGNEE_IDS`) are comma-separated.
- Missing configuration exits with a friendly message; SDK errors surface as normal
  Python tracebacks.

All recipes are executed end-to-end in CI (`tests/python/sdk/test_examples.py`), so
they stay in sync with the SDK.

## Topics

- [Authenticate]({{< ref "authentication" >}}) — `auth_connect.py`, `auth_profiles.py`
- [Projects]({{< ref "projects" >}}) — create/list, status report, backup/restore,
  dataset export
- [Tasks]({{< ref "tasks" >}}) — create from local images or a bucket, inspect and
  export
- [Jobs]({{< ref "jobs" >}}) — list and auto-assign, workflow and annotation import
- [Cloud storage]({{< ref "cloud-storage" >}}) — attach an S3-compatible bucket
