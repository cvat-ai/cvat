# Definition of Done

Personal checklist for when work is **finished**, not merely stopped. Each line needs **evidence** (number, screenshot path, commit hash, or command output) when ticked.

## Before implementation

- [x] Plan committed on `dev-test01` before any feature code (`docs/Plan.md`).  
  **Evidence:** commit `49ea1f63f` — `docs: add assessment plan and tracking documents before implementation`
- [x] CVAT running at http://localhost:8080 with login.  
  **Evidence:** http://localhost:8080 ; user `Ameer_JS` (active account; `is_superuser=False` — normal user is fine)
- [x] Sample task created; COCO 1.0 annotations imported; labelled boxes visible in a job.  
  **Evidence:** task id = **8** (`test_task`); images/frames = **5000**; screenshot [`docs/evidence/01-job-boxes.png`](evidence/01-job-boxes.png)

## Floor (requirements 1–4)

- [x] `test` Django app registered; endpoint returns correct per-class counts for a known task.  
  **Evidence:** task id **8**; `GET /api/test/tasks/8/class-counts` → 80 classes / 41866 annotations; commit `0929950fb`; screenshot [`docs/evidence/02-api-class-counts.png`](evidence/02-api-class-counts.png)
- [x] UI page calls the endpoint for that task.  
  **Evidence:** route `/tasks/8/class-counts`; Actions → Class counts; commit `160b2af7b`; screenshot [`docs/evidence/03-page-graph.png`](evidence/03-page-graph.png)
- [x] Counts shown as a graph.  
  **Evidence:** bar chart on `/tasks/8/class-counts` (top 25 by count); screenshot [`docs/evidence/03-page-graph.png`](evidence/03-page-graph.png); commit `5d37d6c25`
- [x] Empty state (no annotations) and error state (failed request) handled cleanly.  
  **Evidence:** empty → task **#10**, `0 classes · 0 annotations`, Empty + Refresh — [`docs/evidence/04-empty-state.png`](evidence/04-empty-state.png); error → `/tasks/999999/class-counts`, Result + Retry (`Request failed (404)`) — [`docs/evidence/05-error-state.png`](evidence/05-error-state.png)

## Stretch (if reached)

- [ ] #5 Auth: unauthenticated → refused; no task access → refused.  
  **Evidence:** status codes / screenshots ___  
  *(Partial: unauthenticated → 401 observed; no-access user not demonstrated.)*
- [ ] #6 Objective measured (5 runs, median + spread in `Objectives.md`).  
  **Evidence:** link to raw block in Objectives.md
- [ ] #7 One extra filter or grouping documented with rationale.  
  **Evidence:** ___
- [ ] #8–#9 Live WebSocket updates and reconnect (only if 1–4 were done first).  
  **Evidence:** ___

## Submission

- [ ] All unfinished requirements listed with reason (also in Plan or here).
- [ ] Loom ≤ 5 minutes; four knowledge questions answered on camera.
- [ ] PR: `dev-test01` → default branch on **my fork** (not upstream cvat-ai/cvat).
- [ ] Reply with PR link + Loom link within 8 hours of start.

## Not finished (declare at end)

| Requirement | Status | Reason |
|-------------|--------|--------|
| #5 Auth demos | Partial | Need second user for 403; 401 without login works |
| #6 Objective | Not started | No 5-run measurement yet |
| #7 Extra filter | Not started | — |
| #8–#9 WebSocket | Skipped for now | Optional stretch after floor |
| Submission | Not started | Loom + PR later |
