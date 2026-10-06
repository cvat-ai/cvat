# Definition of Done

Personal checklist for when work is **finished**, not merely stopped. Each line needs **evidence** (number, screenshot path, commit hash, or command output) when ticked.

## Before implementation

- [ ] Plan committed on `dev-test01` before any feature code (`docs/Plan.md`).
- [ ] CVAT running at http://localhost:8080 with superuser login.
- [ ] Sample task created; COCO 1.0 annotations imported; labelled boxes visible in a job.  
  **Evidence:** task id = ___ ; images uploaded = ___

## Floor (requirements 1–4)

- [ ] `test` Django app registered; endpoint returns correct per-class counts for a known task.  
  **Evidence:** task id ___ ; sample JSON or test output ___
- [ ] UI page calls the endpoint for that task.  
  **Evidence:** route/path ___ ; screenshot or Loom timestamp ___
- [ ] Counts shown as a graph.  
  **Evidence:** ___
- [ ] Empty state (no annotations) and error state (failed request) handled cleanly.  
  **Evidence:** how triggered ___ ; screenshot ___

## Stretch (if reached)

- [ ] #5 Auth: unauthenticated → refused; no task access → refused.  
  **Evidence:** status codes / screenshots ___
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
| | | |
