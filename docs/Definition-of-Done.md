# Definition of Done

Personal checklist for when work is **finished**, not merely stopped. Each line needs **evidence** (number, screenshot path, commit hash, or command output) when ticked.

## Before implementation

- [x] Plan committed on `dev-test01` before any feature code (`docs/Plan.md`).  
  **Evidence:** commit `49ea1f63f` — `docs: add assessment plan and tracking documents before implementation`
- [x] CVAT running at http://localhost:8080 with login.  
  **Evidence:** http://localhost:8080 ; user `Ameer_JS` (setup used `createsuperuser` per Task.pdf §4)
- [x] Sample task created; COCO 1.0 annotations imported; labelled boxes visible in a job.  
  **Evidence:** task id = **8** (`test_task`); images/frames = **5000**; COCO import; labelled boxes visible in job UI

## Floor (requirements 1–4)

- [x] `test` Django app registered; endpoint returns correct per-class counts for a known task.  
  **Evidence:** task id **8**; `GET /api/test/tasks/8/class-counts` → 80 classes, 41866 annotations; commit `0929950fb`
- [x] UI page calls the endpoint for that task.  
  **Evidence:** route `/tasks/8/class-counts`; Actions → Class counts; commit `160b2af7b`
- [x] Counts shown as a graph.  
  **Evidence:** bar chart on `/tasks/8/class-counts` (Chart.js / react-chartjs-2, top 25 classes by count); local UI change pending push with this docs update
- [ ] Empty state (no annotations) and error state (failed request) handled cleanly.  
  **Evidence:** how triggered ___ ; screenshot ___  
  *(Partial: failed-request Result UI exists; dedicated empty-state demo not done yet.)*

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
| #4 Empty + error states | In progress / partial | Error Result exists; empty case not fully demonstrated |
| #5 Auth demos | Partial | Need second user for 403 |
| #6 Objective | Not started | No 5-run measurement yet |
| #7 Extra filter | Not started | — |
| #8–#9 WebSocket | Skipped for now | Floor #4 first per brief |
| Submission | Not started | Loom + PR later |
