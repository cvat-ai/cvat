# Plan

| | |
|---|---|
| Started | 2026-10-29 15:04 PKT (UTC+05:00) |
| Deadline | 2026-10-29 23:04 PKT |
| Machine | Intel Core i5-3470 @ 3.20 GHz (4 cores), 5 GB RAM for WSL2 (+8 GB swap), Ubuntu 26.04.1 LTS on WSL2, Docker 29.9.2, Compose v5.6.1 |
| CVAT commit | `b36a49bd5cc7e5fe3fc36ecb6036659c8136b780` |
| Data | COCO val2017, one task, segment size 500. Image, annotation and job counts are logged in `objectives.md` after the import. |

This plan is only added to after the first commit. Progress goes in the progress table, and any change of
direction goes under "Changes to this plan" with the time and the reason. The original text stays as it was.

## 1. What I am building

- **Backend:** a new Django app `cvat/apps/test` with one read-only endpoint that returns the number of
  annotations per label for a task.
  - The count is computed in Postgres with one GROUP BY per annotation table (shapes, tracks, tags).
  - It covers the same jobs CVAT itself treats as a task's annotations (`cvat/apps/dataset_manager/task.py:1033`).
  - Access reuses CVAT's existing task VIEW policy (`TaskPermission`), so login and task access behave exactly
    like the rest of the API.
- **Frontend:** a page at `/tasks/:tid/label-counts`, opened from the task's Actions menu. It loads data through
  cvat-core and draws a horizontal bar chart with chart.js / react-chartjs-2, which are already in
  `cvat-ui/package.json`. It has loading, empty and error states.
- **Live (stretch):** the server sends a "task changed" message over a WebSocket after annotations are saved,
  and the page refetches the counts. If the connection drops, the page reconnects with backoff and refetches to
  catch up.
- **No new Python or npm dependencies.** The server image is built once. After that, code changes need only a
  container restart.

## 2. API contract (fixed first, so backend and frontend can be built in parallel)

`GET /api/label-counts?task_id=<id>[&job_id=<id>]` returns `{task_id, job_id, total, labels: [{id, name, color, count}]}`.
- Every top-level label of the task is listed, including labels with 0, sorted by count and then name.
- 400: bad or missing `task_id`, or a `job_id` that is not a job of that task.
- 401: no login. 403: no access to the task. 404: no such task.

## 3. Order of work and time

| # | Work | Items | Time | Planned window (PKT) | Done when |
|---|------|-------|------|----------------------|-----------|
| 0 | Server image build, stack up, COCO task import (they run on their own while I work) | setup | - | 15:04-16:30 | A job opens with labelled boxes |
| 1 | Plan, objectives, empty Definition of Done; first commit | - | 0:30 | 15:04-15:40 | Committed before any code |
| 2 | App, count query, endpoint with CVAT login and task permission | 1, 5 | 1:10 | 15:40-16:50 | curl returns counts for the COCO task |
| 3 | cvat-core client, page, route, menu entry, bar chart, empty and error states (in parallel with 2) | 2, 3, 4 | 1:10 | 15:40-16:50 | Lint and type check pass |
| 4 | Check counts against the database and the COCO file | 1 | 0:20 | 16:50-17:10 | Mismatches are 0 (MO-2) |
| 5 | End-to-end check. **Gate: items 1-4 must work before anything below starts** | 1-4 | 0:20 | 17:10-17:30 | Chart, empty and error states seen in the browser |
| 6 | Proof of refusal: no login, and a user without access | 5 | 0:20 | 17:30-17:50 | 401 and 403 captured |
| 7 | Speed objective MO-1: 5 runs, median and spread | 6 | 0:30 | 17:50-18:20 | Raw output in `objectives.md` |
| 8 | Job filter (backend and page) | 7 | 0:40 | 18:20-19:00 | Per-job counts add up to the task total |
| 9 | Live updates over WebSocket, and reconnect after a drop | 8, 9 | 1:30 | 19:00-20:30 | A box drawn in a job moves the bar; a server restart recovers |
| 10 | Decision record, Definition of Done with evidence, PR in my fork | 10 | 0:50 | 20:30-21:20 | PR open |
| | Recording and buffer | | | 21:20-23:04 | Loom under 5 minutes, reply sent |

**Stop rules:**
- If the gate (step 5) has not passed by 18:00, steps 8 and 9 are dropped and recorded as not done.
- If live updates do not work by 20:30, I stop and write down why.

## 4. Risks I already know about

- **Memory:** 5 GB RAM is below the 8 GB the brief suggests. If the import or the UI build struggles, I use
  fewer images (with a matching filtered COCO file, since unmatched images make the import fail) and log how many.
- **Unknown codebase:** unfamiliar parts get checked by reading the code and the live database before relying
  on them, and are logged as K4 notes.

## 5. Decided to skip

- New Python or npm dependencies (this keeps one image build, and rules out Django Channels for item 8).
- A Redux store for the page. Page-local state is enough for one read-only view.
- Project-level and job-level pages. The endpoint can filter by job; the page is per task.
- Caching the counts. I will measure first, and only cache if MO-1 is missed.
- Cypress end-to-end tests and a CHANGELOG fragment.
- Counting skeleton elements, track keyframes and intervals (see the counting rule in `objectives.md`).

## 6. Progress (rows added as work happens)

| Time (PKT) | Step | Status | Note |
|------------|------|--------|------|
| 15:04 | - | started | Clock started |
| 15:37 | 1 | done | Plan, objectives and empty Definition of Done committed before any code |
| 15:38 | 0 | done | Server image built from this commit |
| 16:05 | 2 | code done | Endpoint answers 401 (no login), 400 (missing or non-integer `task_id`), 404 (unknown task). 200 and 403 wait for the COCO task |
| 16:19 | 3 | code done | cvat-core client, page, route, menu entry, bar chart, empty and error states. Lint and type check pass; not yet seen in a browser with data |
| 16:23 | 2 | tested | 14 backend tests for the counting rule pass |
| 16:25 | 0 | late | COCO task not created yet; steps 4-5 wait for it |
| 17:14 | 0 | done | COCO task 1 imported: 5000 images, 10 jobs, 41,866 shapes |
| 17:15 | 4 | done | MO-2: endpoint, SQL and COCO file agree on all 80 labels (multi-part polygons counted as CVAT stores them) |
| 17:52 | 5 | done | Gate passed in Chrome: chart, empty state, refused user, server stopped and Retry recovery |
| 17:47 | 6 | done | 401 and 403 shown live and in 6 HTTP tests against the real OPA policy |
| 17:54 | - | done | Backend and frontend branches merged into `dev-test01` |
| 17:54 | 7 | done | MO-1 run 1: median 108.7 ms, target 100 ms missed by 8.7 ms |
| 18:14 | 8 | done | Job filter: the 10 job totals add up to the task total (41,866); the page has a job Select |
| 18:14 | 9 | skipped | Live updates and reconnect not started, see the 18:12 change |

## 7. Changes to this plan (added, never rewritten)

- 15:38: Backend and frontend are built on two branches, `label-counts-backend` and `label-counts-frontend`,
  each merged into `dev-test01` after the gate in step 5. Why: steps 2 and 3 run in parallel, and separate
  branches keep each side's commits in order without the two touching the same files.
- 16:23: Backend tests run with `cvat.settings.production` and Django's throwaway test database, not with
  `cvat.settings.testing`. Why: the testing settings import development-only packages (`django_extensions`)
  that the server image does not include, and installing them would change the image.
- 17:13: The stop rule for the gate moves from 18:00 to 19:00. Why: the floor code was finished by 16:23,
  but the COCO task could only be created and imported after that, so the gate waits on data, not on code.
  The stretch cutoff stays at 20:30, which still leaves 2.5 h for documents, the PR and the recording.
- 17:45: Item 5's tests were written while the last floor check (the empty state) was still waiting on its
  test task. Why: every other floor check had passed, and the tests touch only the backend branch.
- 17:55: Code and documents freeze at 20:00 instead of 21:20, and live updates (items 8-9) only start if the
  job filter (item 7) is done by 18:45. Why: I need about 3 h at the end to go through the code I am
  submitting, set up a microphone and record. Explaining the work is assessed before the code is.
- 18:00: The filter for item 7 is **by job**. Why: CVAT splits a task into jobs and assigns each job to an
  annotator, so per-job counts answer "how far is each person, and on which classes". It reuses the same
  query with one extra filter on `job_id`, which already has an index. Filtering by shape type was rejected,
  because the COCO import produces almost only polygons, and filtering by source was rejected, because every
  imported row has the source `file`.
- 18:12: Live updates (items 8 and 9) are not built. Why: the job filter was done at 18:14, after the 18:00
  start the stretch needed, and the remaining work (a WebSocket route, change notifications from the annotation
  save path, reconnect logic in the page) is about 1.5 h, which would run past the 20:00 freeze.

## 8. Decision record

- **Approach taken:** count in the database. `cvat/apps/test/counts.py` runs one `GROUP BY label_id` per
  annotation table (top-level shapes, top-level tracks, tags) over the task's jobs, and merges the result onto
  `task.get_labels()`. Access is delegated to CVAT's existing task VIEW policy (`TaskPermission`), so there are
  no new rules.
- **Approach rejected:** reuse CVAT's own annotation loader (`dataset_manager`'s `TaskAnnotation`, the code
  behind `GET /api/tasks/<id>/annotations`) and count the loaded objects per label in Python.
- **What rejecting it cost:**
  - CVAT's loader already knows which jobs and which rows make up "the task's annotations". By not using it,
    the counting rule had to be re-stated by hand:
    - the job types, mirrored from `dataset_manager/task.py:1033`,
    - skipping skeleton elements and track keyframes,
    - project-level labels.
  - That needed its own 14 tests.
  - If CVAT changes that rule, `counts.py` must be updated to match.
  - It also meant learning how the import stores COCO, which is how the 36,781 instances turned into 41,866
    stored shapes (MO-2).
  - In return, nothing is loaded into Python. The loader would build all 41,866 shapes as objects for every
    request, which could not meet MO-1.
