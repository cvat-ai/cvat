# Plan: Annotation Analytics

## Goal
Add an API endpoint that returns annotation counts per class for a CVAT task,
and a page that shows them as a graph.

## Environment
- Branch: dev-test01
- CVAT commit SHA at clone: d4d08dedb5ad7c5e980c0bc7319a7f5587365dad
- Dataset: COCO 2017 val, 500 images in task #4 (`coco-val-500`), the first
  500 images by file name. The official annotation file was filtered to these
  images (`instances_val2017_500.json`) because CVAT's COCO importer fails on
  images that are not in the task.
- Counting definition: one annotation is one persisted CVAT shape record
  (including polygons and masks), not one source COCO annotation. COCO's
  3,541 source annotations are 3,504 normal and 37 crowd. The 3,504 normal
  ones become 3,916 polygon records in CVAT (multi-part segmentations give
  412 extra), and the 37 crowd ones become 37 masks, for 3,953 shapes total.
- The response lists only labels with at least one shape. Labels with zero
  shapes (toaster, hair drier) are left out.
- The optional `shape_type` filter takes CVAT's own shape types. I chose it
  because it shows the 37 masks and 3,916 polygons separately, and that
  split is the one I could check against the database.

## Order of work and time budget (8 hours)

This table is my original estimate. It was not rewritten afterwards.

| # | Item | Estimate |
|---|------|----------|
| 0 | Setup, dataset import (waiting time not counted) | 0.5 h |
| 1 | Read CVAT code: find where labels and shapes are stored | 1 h |
| 2 | Backend: new Django app `test`, endpoint with per-class count | 1.5 h |
| 3 | Frontend: page, call endpoint, bar chart | 1.5 h |
| 4 | Empty state and error state | 0.5 h |
| 5 | Auth: no login refused, no task access refused | 0.5 h |
| 6 | Speed target: set, measure 5 runs, report | 0.5 h |
| 7 | One filter or grouping | 0.5 h |
| 8-9 | WebSocket live update and reconnect | 1 h, only if time remains |
| 10 | Decision record, final docs, Loom | 0.5 h |

## Decided to skip
- Video tasks: the sample data is COCO images only, and video tracks
  would change what "one annotation" means. Counts cover image tasks
  (shapes) only.
- Items 8-9 (WebSocket live update and reconnect): skipped, see Plan changes.

## How to run my code
The CVAT server image does not contain the `test` app, and I did not rebuild
the image. I start the server with an override file kept outside the repo
(`D:\xis\compose.local.yml`) that mounts my files into the container:

    services:
      cvat_server:
        volumes:
          - D:/xis/cvat/cvat/apps/test:/opt/cvat/cvat/apps/test
          - D:/xis/cvat/cvat/settings/base.py:/opt/cvat/cvat/settings/base.py
          - D:/xis/cvat/cvat/urls.py:/opt/cvat/cvat/urls.py

    docker compose -p cvat -f docker-compose.yml -f D:\xis\compose.local.yml up -d

After a code change I only restart `cvat_server`. The page is at
`/api/test/analytics?task=4` and the endpoint at
`/api/test/tasks/<task_id>/class-counts`, both on a logged-in CVAT session.

## Decision record
- **Taken:** a small Django app `cvat.apps.test` with one ViewSet. It counts
  `LabeledShape` rows for the task and groups them by `label__name`. Access
  goes through CVAT's own `TaskPermission` and `get_object()`, so I wrote no
  permission check of my own. The page is plain HTML served by the same app.
- **Rejected:** adding a route and page inside CVAT's React UI.
- **What rejecting it cost:** the page is not in CVAT's menu, it does not use
  CVAT's UI components or styling, and a user has to open
  `/api/test/analytics` directly.
- **Why I rejected it:** yarn was not installed on my machine, and the UI
  needs a large workspace install and build. With Docker limited to
  3.76 GiB RAM and the time I had left, I would not have finished it.
- **Smaller choice:** zero-count labels are omitted from the response. A
  client that wants all 80 labels has to fill in the missing ones itself.

## Plan changes
- Added the counting definition after I found 3,953 shapes in CVAT against
  3,541 annotations in the COCO file, and traced the 412 difference.
- Filtered the COCO annotation file to the 500 task images, because the
  first import of the full file failed.
- Served the page from the Django app instead of CVAT's React UI, for the
  reason in the decision record.
- Added the `shape_type` filter after checking the totals: 3,953 without
  filter, 3,916 polygon, 37 mask.
- Items 8-9 were not started. Items 1-7 and their evidence took the time I
  had, and I did not want to start something I could not finish and show.