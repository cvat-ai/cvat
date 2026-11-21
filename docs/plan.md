# Plan: Annotation Analytics

## Goal
Add an API endpoint that returns annotation counts per class for a CVAT task,
and a page that shows them as a graph.

## Environment
- Branch: dev-test01
- CVAT commit SHA at clone: d4d08dedb5ad7c5e980c0bc7319a7f5587365dad
- Dataset: COCO 2017 val, 5,000 images (planned; actual count updated after import)

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