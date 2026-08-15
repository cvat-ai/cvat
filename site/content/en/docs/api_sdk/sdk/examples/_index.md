---
title: 'Common tasks (examples)'
linkTitle: 'Common tasks'
weight: 8
description: 'Short, copy-pasteable SDK examples grouped by domain area'
---

Each topic in this section is a small function that takes an already-authenticated `client`. The
full, runnable modules live in
[`cvat-sdk/examples/`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples). Authenticate
once and reuse the client:

```python
import os
from cvat_sdk import make_client

with make_client(os.environ["CVAT_HOST"], access_token=os.environ["CVAT_ACCESS_TOKEN"]) as client:
    ...  # call any example function with `client`
```

These examples use the high-level SDK (`client.projects` / `.tasks` / `.jobs` / `.users`). Two
operations drop to the low-level `client.api_client` because no high-level proxy exists yet (cloud
storage and the annotation-format list); each is called out in a _Notes_ block. See the
[high-level API]({{< ref "highlevel-api" >}}) and [low-level API]({{< ref "lowlevel-api" >}})
references for the full surface.

All of the code in this section is exercised in CI (`tests/python/sdk/test_examples.py`), so it stays
in sync with the SDK.

## Topics

- [Authenticate a client]({{< ref "authentication" >}}) - token, profile, and the deprecated
  password fallback.
- [Manage projects]({{< ref "projects" >}}) - CRUD, backup/restore, a CSV status report, and
  exporting a project dataset.
- [Manage tasks]({{< ref "tasks" >}}) - create from local files or cloud storage, list/filter,
  inspect, and export a task dataset to local disk or cloud.
- [Manage jobs]({{< ref "jobs" >}}) - list/filter, change stage, and round-robin assignment.
- [Manage a cloud storage]({{< ref "cloud-storage" >}}) - attach an S3-compatible bucket.
