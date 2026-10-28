# Definition of Done

Written before code. Each line gets ticked only with evidence (a number, a command output or a link) beside it.

## Floor (items 1–4)

- [x] Endpoint returns per-class counts that match an independent count of the COCO file for the same images.
  **80/80 classes equal, total 41,866** — [endpoint_task2.json](bench/results/endpoint_task2.json) vs
  [coco_expected.txt](bench/results/coco_expected.txt) from [coco_expected_counts.py](bench/coco_expected_counts.py).
  It matches the "parts" column, not COCO's 36,781 annotations: CVAT's COCO import stores each polygon of a
  multi-part annotation as its own `LabeledShape` (DB check: 41,420 polygons + 446 masks = 41,866 rows).
- [~] Ground-truth / replica jobs and skeleton child points are not double counted. Reasoned in
  [stats.py](../cvat/apps/test/stats.py) (`job__type=ANNOTATION`, `parent__isnull=True`); **not exercised** —
  the COCO task has neither GT jobs nor skeletons.
- [x] Task page Actions menu links to the stats page — [actions-menu.png](evidence/actions-menu.png).
- [x] Page shows a bar chart of counts per class — [page-chart.png](evidence/page-chart.png) (all 80 labels).
- [x] Task with zero annotations shows an empty state, not an empty chart — task 1, [page-empty.png](evidence/page-empty.png).
- [x] Failed request shows an error with a retry button — request aborted in the browser,
  [page-error.png](evidence/page-error.png); clicking Retry after un-blocking re-renders the chart (headless Edge run).

## Access (item 5)

All in [access.txt](bench/results/access.txt), raw `curl -i` against the running stack.

- [x] No login → **401**.
- [x] Logged-in user without access to the task → **403** (alice on admin's task 2; core `/api/tasks/2/annotations` gives her the same 403).
- [x] User with access → **200** (admin on 1 and 2; alice on task 1 once assigned to it, still 403 on task 2).

## Objective (item 6)

- [ ] MO-1 measured: 5 runs, raw output in `docs/OBJECTIVES.md`.
- [ ] Target met, or missed with the reason written down.

## Beyond the floor (items 7–10)

- [ ] Grouping by shape type works and the reason for choosing it is written.
- [ ] Drawing/deleting a box in a job updates the open stats page without reload.
- [ ] Killing the connection (server restart) → page shows "reconnecting", then recovers and refreshes counts.
- [ ] Decision record in `docs/PLAN.md`.

## Hygiene

- [ ] No dead code, commented-out blocks or stray files in the diff (`git diff --stat main...dev-test01` reviewed).
- [ ] Commits are small and each message says what and why.
- [ ] Everything not finished is listed below.

## Not finished

(Filled in at the end.)
