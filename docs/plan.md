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
- Count response includes only labels with at least one shape; labels with
  zero shapes are omitted.
- The optional `shape_type` filter accepts validated CVAT `ShapeType`
  values. It was chosen because it separates masks and polygons and makes
  the 37-mask plus 3,916-polygon split directly verifiable.

## Order of work and time budget (8 hours)

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
- Items 8-9 (WebSocket live update and reconnect) if items 1-7 are not
  finished by hour 6.

## Decision record
(filled in at the end)