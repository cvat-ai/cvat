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

- [x] #5 Auth: unauthenticated → refused; no task access → refused.  
  **Evidence:** Task.pdf §3 item 5 requires **both**.  
  - No login → UI redirects to CVAT login (`/auth/login?next=/tasks/9/class-counts`); console shows **401** on auth APIs — [`docs/evidence/07-401-no-login.png`](evidence/07-401-no-login.png). Direct API `GET /api/test/tasks/8/class-counts` without credentials → **401**.  
  - Logged in as `ameerulaman3` on owner’s task → **403** “You do not have permission…” — [`docs/evidence/06-403-no-permission.png`](evidence/06-403-no-permission.png). Owner `Ameer_JS` → **200**.
- [x] #6 Objective measured (5 runs, median + spread in `Objectives.md`).  
  **Evidence:** [`docs/Objectives.md`](Objectives.md) MO-1 — median **64.72 ms**, target ≤ 100 ms, **met**
- [x] #7 One extra filter or grouping documented with rationale.  
  **Evidence:** optional query `job_id` on `GET /api/test/tasks/{id}/class-counts` (+ UI “Filter by job” select). **Why:** CVAT splits tasks into jobs; reviewers need per-job class totals without exporting the whole task. Invalid/foreign `job_id` → 400. Screenshot: [`docs/evidence/08-filter-by-job-in-class-count.png`](evidence/08-filter-by-job-in-class-count.png) (task 9, Job #5 selected).
- [x] #8–#9 Live WebSocket updates and reconnect (only if 1–4 were done first).  
  **Evidence:**  
  - **#8 Live:** WS `/api/test/ws/tasks/{id}/class-counts` (session auth); Redis pub/sub when annotations change (`handle_annotations_change` → `cvat.apps.test.realtime`); UI **Live** badge, quiet refetch, toast + “Last live update” timestamp. Side-by-side demo (class-counts + job editor): before [`docs/evidence/09-before-updating-labels.png`](evidence/09-before-updating-labels.png) → after live update [`docs/evidence/10-after-updating-labels.png`](evidence/10-after-updating-labels.png).  
  - **#9 Reconnect:** client reconnects with exponential backoff; badge shows **Reconnecting…** then **Live** again after a dropped socket.

## Submission

- [ ] All unfinished requirements listed with reason (also in Plan or here).
- [ ] Loom ≤ 5 minutes; four knowledge questions answered on camera.
- [ ] PR: `dev-test01` → default branch on **my fork** (not upstream cvat-ai/cvat).
- [ ] Reply with PR link + Loom link within 8 hours of start.

## Not finished (declare at end)

| Requirement | Status | Reason |
|-------------|--------|--------|
| Submission | Not started | Loom + PR later |
