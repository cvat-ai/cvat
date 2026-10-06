# Annotation Analytics Assessment — Plan

**Branch:** `dev-test01`  
**CVAT commit (clone):** `98ee84d0fb5f677d31acf71ec5f797f560f00f5f`  
**Environment:** Windows 11, Docker Compose, `CVAT_HOST=localhost`, http://localhost:8080

## Goal

Add per-class annotation counts for a CVAT task: backend API reading from the database, UI page with a chart, empty and error states, then auth and performance where time allows.

## Order of work

Work follows the assessment list. Items **1–4 are the floor**; I will not start WebSocket work (8–9) until 1–4 work end-to-end.

| Step | Requirement | What I will do | Budget |
|------|-------------|----------------|--------|
| 0 | Setup | Fork/clone, `dev-test01`, Docker, superuser, COCO val2017 sample task with COCO 1.0 import; record image count | ~1 h (mostly Docker/data; not counted as heavily) |
| 1 | #1 API | New Django app `test`: endpoint returning annotation counts per class for a given `task_id`, query against CVAT models | ~1.5 h |
| 2 | #2 Page | React route/page under CVAT UI that calls the endpoint for the current task | ~1 h |
| 3 | #3 Graph | Render counts as a bar (or similar) chart on that page | ~45 min |
| 4 | #4 Empty/error | Explicit UI for zero annotations and for failed HTTP (4xx/5xx/network) | ~45 min |
| 5 | #5 Auth | Use CVAT session/auth; 401 when not logged in; 403 when user cannot access task; verify both | ~1 h |
| 6 | #6 Objective | Pick one latency target for the endpoint, measure 5 runs, median + spread in `docs/Objectives.md` | ~45 min |
| 7 | #7 Extra filter | One grouping/filter beyond raw count (e.g. by job or label subset); short rationale in docs | ~1 h |
| 8 | #8–#9 Live WS | WebSocket push when annotations change; client reconnect after drop | ~1.5 h **only if 1–4 done** |
| 9 | Close-out | Tick `Definition-of-Done.md` with evidence, list unfinished items, Loom ≤5 min, PR on own fork | ~1 h |

**Total planned:** ~8 h of focused work after stack is up.

## How I will navigate the codebase

- **Backend:** Find how existing task/annotation APIs are registered (URLconf, DRF viewsets/permissions). Locate models linking tasks → jobs → shapes/labels before writing queries in `test`.
- **Frontend:** Follow an existing task-scoped page (routing, API client, auth cookies) and mirror patterns for the new analytics page.
- **Commits:** Small steps (docs → app scaffold → endpoint → wire URL → page → chart → states → auth → objective evidence).

## Sample data

- COCO 2017 validation images + `instances_val2017.json` (COCO 1.0 upload).
- Use as many images as the machine handles comfortably; **image count recorded in Definition of Done** when import is finished.

## Intended skips (if time runs out)

Priority is a **working, explainable 1–4** over stretching to 8–9.

| Item | Likely skip? | Reason |
|------|--------------|--------|
| #8–#9 WebSocket + reconnect | Done | Redis pub/sub + `/api/test/ws/tasks/{id}/class-counts`; UI auto-reconnect |
| #7 Extra filter/grouping | Done | Chose optional `job_id` filter (see below) |
| #10 Decision record in Plan | Only if #10 reached | Add closing section: chosen vs rejected approach |

### #7 choice (extra filter)

- **Took:** `?job_id=` on class-counts (UI: Filter by job).
- **Why:** Tasks are split into jobs; reviewers need class totals for one job without the whole task.
- **Rejected:** filter by shape type only — less useful in day-to-day CVAT review than job scope.

If I skip anything, it will be listed in Definition of Done with **why**, not hidden.

## Risks and mitigations

- **Unfamiliar CVAT schema:** Spend first backend hour tracing models and one existing count/list endpoint rather than guessing table names.
- **Docker/UI rebuild:** Prefer changes that work with the running Compose stack; note if a frontend rebuild is required.
- **Over-scoping WebSocket:** Defer until REST path is demo-ready for the recording.

## Decision record (fill if requirement #10 is reached)

_To be completed at end of work if time allows._

- **Approach taken:** _TBD_
- **Approach rejected:** _TBD_
- **Cost of rejection:** _TBD_
