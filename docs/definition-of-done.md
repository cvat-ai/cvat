# Definition of Done: Annotation Analytics

Boxes stay unticked until I have evidence for them. No evidence, no tick.

Reference: CVAT commit d4d08dedb5ad7c5e980c0bc7319a7f5587365dad,
branch dev-test01, objective MO-1 in docs/objectives.md.

## Floor (items 1-4)

- [x] 1. Endpoint returns the number of annotations per class for a task,
      read from the database.
      Evidence: docs/evidence/endpoint-task4-response.png (HTTP 200,
      task_id 4, total 3,953).
- [x] 1a. Counts checked against a known task (compared with what CVAT shows).
      Baseline: task #4 CVAT statistics and a database query both show
      3,953 shapes (3,916 polygons + 37 masks).
      Files: docs/evidence/cvat-stats-task4-polygon.png,
      docs/evidence/cvat-stats-task4-mask.png,
      docs/evidence/task4-db-counts.txt.
      The difference from COCO's 3,541 annotations is explained in
      docs/evidence/coco-polygon-parts.txt (COCO source counts:
      docs/evidence/expected-counts-coco-500.txt).
      Endpoint comparison: docs/evidence/cvat-stats-task4-person-chair-car.png,
      docs/evidence/cvat-stats-task4-polygon-detail.png and
      docs/evidence/cvat-stats-task4-mask-detail.png show person 1217,
      chair 227 and car 195, the same totals the endpoint returned.
- [x] 2. A page in the web interface calls the endpoint.
      The page is served by the test Django app at /api/test/analytics,
      not inside CVAT's React UI.
      Evidence: docs/evidence/page-chart-task4.png.
- [x] 3. Counts are shown as a graph.
      Evidence: docs/evidence/page-chart-task4.png.
- [x] 4a. Empty state (task with no annotations) handled cleanly.
      Evidence: docs/evidence/page-empty-task5.png.
- [x] 4b. Failed request handled cleanly.
      Evidence: docs/evidence/page-error-404.png (task 9999 returns 404).

## Access control (item 5)

Status codes below were what I expected; the evidence shows what CVAT's
existing permission behaviour actually returned.

- [x] 5a. Request with no login is refused (expected 401 Unauthorized).
      Evidence: docs/evidence/auth-5a-no-token.png (HTTP 401).
- [x] 5b. User without access to the task is refused (expected 403 Forbidden).
      Evidence: docs/evidence/auth-tester2-login.png (HTTP 200, secrets
      hidden) and docs/evidence/auth-5b-no-task-access.png (HTTP 403).
- [x] 5c. User with access to the task is served (expected 200 OK).
      Evidence: docs/evidence/endpoint-task4-response.png (HTTP 200,
      task_id 4, total 3,953).

## Performance (item 6)

- [x] 6a. MO-1 measured: 5 runs after one warm-up.
      Evidence: docs/evidence/mo1-runs.txt (every line has status 200).
- [x] 6b. Median, minimum and maximum reported.
      Evidence: docs/objectives.md (median 206.8 ms, minimum 82.0 ms,
      maximum 274.7 ms).
- [x] 6c. Target (median at or below 500 ms) met, or missed with the
      reason written down in docs/objectives.md.
      Evidence: docs/objectives.md (median 206.8 ms; target 500 ms, met).

## Filter or grouping (item 7)

- [x] 7a. One filter or grouping added beyond the plain count.
      Evidence: docs/evidence/shape-filter-all.png (no filter: 3953),
      docs/evidence/shape-filter-mask.png (shape_type=mask: 37),
      docs/evidence/shape-filter-polygon.png (shape_type=polygon: 3916),
      docs/evidence/shape-filter-invalid.png (shape_type=abc: 400).
- [x] 7b. Reason for choosing it written down.
      Evidence: docs/plan.md (Environment, shape_type paragraph).

## Live updates (items 8-9)

- [ ] 8. Graph updates live over WebSocket.
      Not started, see Not finished.
- [ ] 9. Page recovers when the connection drops and comes back.
      Not started, see Not finished.

## Documents and honesty

- [x] 10. Decision record written at the end of docs/plan.md (approach
      taken, approach rejected, what rejecting it cost).
      Evidence: docs/plan.md (Decision record).
- [x] Plan changes during the work are noted with the reason.
      Evidence: docs/plan.md (Plan changes).
- [x] Actual image count recorded in Plan and Objectives: 500 images in
      task #4 (`coco-val-500`).
      Evidence: CVAT job #4 page shows frame count 500 (100%), frame range
      0-499 (docs/evidence/task4-frame-count.png); docs/plan.md and
      docs/objectives.md both state 500.
- [x] Everything I did not finish is listed below, with why.
      Evidence: the Not finished section of this file.

## Submission

- [x] Public fork contains branch dev-test01.
      Evidence: origin https://github.com/Hiba-Shahid/cvat.git,
      branch dev-test01 at commit 43416f271.
- [x] One PR opened from dev-test01 into my fork's main branch.
      Evidence: https://github.com/cvat-ai/cvat/pull/11511
      (Hiba-Shahid/cvat:dev-test01 into cvat-ai/cvat:develop, PR #11511).
- [x] Loom recording is no longer than 5 minutes and answers K1-K4 without notes.
      Evidence: https://www.loom.com/share/d0cab146d54b491092a8646792f4bc6b
      (title: Annotations Endpoint and Backend Optimization; duration: 5 min).
- [ ] PR and Loom links sent in reply to the assessment message within 8 hours.
      Evidence:

## Not finished

- Items 8-9 (WebSocket live update, reconnect): not started. Items 1-7, the
  evidence and the measurement used the time I had, so I did not start
  something I could not finish and show working.
- The page is not inside CVAT's React UI. It is a Django-served page at
  /api/test/analytics, because the UI needs a large yarn workspace build
  that did not fit my time and RAM.