# Definition of Done

Written before code. Each line gets ticked only with evidence (a number, a command output or a link) beside it.

## Floor (items 1–4)

- [x] Endpoint returns per-class counts that match an independent count of the COCO file for the same images.
  **80/80 classes equal, total 41,866** — [endpoint_task2.json](bench/results/endpoint_task2.json) vs
  [coco_expected.txt](bench/results/coco_expected.txt) from [coco_expected_counts.py](bench/coco_expected_counts.py).
  It matches the "parts" column, not COCO's 36,781 annotations: CVAT's COCO import stores each polygon of a
  multi-part annotation as its own `LabeledShape` (DB check: 41,420 polygons + 446 masks = 41,866 rows).
- [x] Ground-truth jobs and skeleton child points are not double counted. Throwaway task on the live stack,
  [exclusion_check.py](bench/exclusion_check.py) → [exclusion_check.txt](bench/results/exclusion_check.txt): a box
  in a ground-truth job leaves the count at 1 (the GT job does hold the shape), and a skeleton stored with 2 child
  points counts as 1. Consensus replica jobs use the same `job__type` filter but were not exercised.
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

- [x] MO-1 measured: 5 runs × 20 requests, raw output in [mo1_baseline.txt](bench/results/mo1_baseline.txt).
- [x] Target met: **median p95 105.5 ms (spread 91.6–113.8) vs 150 ms**. Met without tuning; the server-side
  split (SQL 23 ms, OPA 2 ms, naive loop 1,088 ms) is in [OBJECTIVES.md](OBJECTIVES.md).

## Beyond the floor (items 7–10)

- [x] Grouping by shape type works and the reason for choosing it is written.
  Totals per type equal the DB (41,420 polygon + 446 mask), per-label types sum to the label count;
  [page-split.png](evidence/page-split.png). **Why this one:** in COCO the type separates segmentation polygons from
  `iscrowd` regions (446 masks, 227 of them "person"), which are usually excluded when training, so a class's
  usable count is not its raw count. Rejected: a per-job filter (more useful to a manager, but every COCO job looks
  alike) and grouping by `source` (all 41,866 are "file" after import, so it would show nothing). Cost: +10 ms query
  time, MO-1 still met (115.5 ms).
- [x] Drawing/deleting a box in a job updates the open stats page without reload. A box added through CVAT's
  annotations API (another client) reaches the open page in **755 ms**, 300 ms of which is the deliberate debounce
  ([live_browser.txt](bench/results/live_browser.txt), [live-update.png](evidence/live-update.png)). Socket alone:
  "changed" arrives **94–109 ms** after the save; forged ticket and another task's ticket refused with 403
  ([live_check.py](bench/live_check.py)). Tested with API writes, not by drawing in the annotation UI.
- [x] Killing the connection (server restart) → page shows "reconnecting", then recovers and refreshes counts.
  `docker restart cvat_server`: page shows "Reconnecting…" while keeping the last counts
  ([live-reconnecting.png](evidence/live-reconnecting.png)). Server unreachable for ~130 s; page back to "Live"
  **164 ms after the server answered again** (worst case is the 15 s backoff cap). Next box after the reconnect
  appears in 596 ms ([live-recovered.png](evidence/live-recovered.png)).
- [x] Decision record in [PLAN.md](PLAN.md#decision-record--how-the-page-learns-that-counts-changed-items-89):
  raw ASGI + Redis pub/sub + REST re-fetch, rejected Django Channels, four costs listed.

## Hygiene

- [x] No dead code, commented-out blocks or stray files in the diff. `git diff --stat e3ae81e36..HEAD`: 18 code
  files (new app `cvat/apps/test`, new `cvat-ui/.../annotation-stats-page/`, and 6 small edits to existing files:
  settings, urls, asgi, app routes, task menu, webpack proxy) plus `docs/`. The review removed one thing: an unused
  user id in the WebSocket ticket (`f8fdecf1d`). black, isort, eslint, stylelint and `tsc --noEmit` pass.
  Local-only helpers (compose mount override, browser scripts) are kept out of the repo.
- [x] Commits are small and each message says what and why: plan first (`f683d7c37`), then one commit per step,
  fixes in their own commits (`8f22efd04` 500 on every request, `ea0a09416` unreadable chart).
- [x] Everything not finished is listed below.

## Not finished

- **Drawing in the annotation UI by hand** was not part of the automated runs. Live updates were tested with
  writes through CVAT's annotations API (the same endpoint the annotation UI saves to) while the page was open.
- **No tests in CVAT's own suite.** Verification is the scripts in `docs/bench/` against a running stack, not
  `manage.py test` / REST API tests. Writing them needs CVAT's test fixtures and a test DB, and I judged the time
  better spent on items 8–9.
- **Production UI build not run.** The page ran from the webpack dev server (`ws: true` proxy). The WebSocket itself
  was tested through the real Traefik → nginx → uvicorn path on :8080, but a `Dockerfile.ui` build was not.
- **`cvat/schema.yml` not regenerated**, so the new endpoint is missing from the published OpenAPI schema and the
  generated SDK.
- **Consensus replica jobs** are excluded by the same filter as ground truth but were not exercised.
- **Chart accessibility:** values are in the hover tooltip and the bars, with no table view.
- **Task level only.** No project- or job-level stats.
- **Revoked access does not cut an open socket** (see the decision record). It only receives "changed" pings, and the
  re-fetch is refused.
