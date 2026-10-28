# Plan — Annotation Analytics (per-class counts)

Branch `dev-test01`, cloned from `cvat-ai/cvat` at `e3ae81e36a98bcc69c1549f6f96c7a193f12b9cd`.
Started 2026-10-28 16:47 (UTC+5). Machine: Intel i5-12450H, 15.7 GB RAM, Windows 11 Home (build 26200), Docker via WSL2.

## What I found before writing code

| Question | Answer (file) |
|---|---|
| Where is a shape's label? | `LabeledShape.label` → `Label` (FK on abstract `Annotation`, `cvat/apps/engine/models.py`). Same for `LabeledTrack`, `LabeledImage` (tags). |
| Task → annotation path | `Task` ← `Segment.task` ← `Job.segment` ← `LabeledShape.job`. No direct task FK on shapes. |
| Traps | Ground-truth and consensus-replica jobs (`Job.type`) hold copies of annotations → count `type="annotation"` only. Skeleton points are child shapes (`parent` set) → count top-level only. |
| Auth / access | Reuse `TaskPermission.create_scope_view(...).check_access()` (OPA) instead of writing new Rego rules. |
| "Annotations changed" hook | Every write in `dataset_manager/task.py` calls `db_task.touch()` = `save(update_fields=["updated_date"])`. A `post_save` receiver on `Task` in my app sees it, without editing core. |
| WebSocket stack | No Channels. uvicorn[standard] + `websockets` already installed; nginx forwards `Upgrade`; Traefik routes `/api/` to the server. 2 uvicorn processes + RQ workers → need Redis pub/sub across processes. |
| Chart | `chart.js` / `react-chartjs-2` already in `cvat-ui/package.json` (unused). No new dependency. |

## Order of work (budget out of 8 h)

| # | Step | Budget |
|---|---|---|
| 0 | Docs: this Plan, Objectives draft, Definition of Done — committed before code | 0:30 |
| 1 | Django app `cvat.apps.test`: `GET /api/annotation-stats?task_id=` — one aggregate query, `GROUP BY label` | 1:00 |
| 5 | Same endpoint: CVAT session/token auth + task view permission. Demonstrate 401 and 403 with curl | 0:30 |
| 2–4 | UI page `/tasks/:id/annotation-stats`, link in task Actions menu, bar chart, empty state and error state with retry | 1:30 |
| 6 | MO-1 latency objective: script, 5 runs, raw output in `docs/OBJECTIVES.md` | 1:00 |
| 7 | Grouping: counts split by shape type (rectangle / polygon / mask …) per class, stacked bars | 0:45 |
| 8 | Live updates: `Task` post_save → Redis pub/sub → raw ASGI WebSocket → page re-fetches | 1:30 |
| 9 | Reconnect with backoff, connection status shown on page | (in 8) |
| 10 | Decision record (below), DoD evidence, PR into my fork | 0:45 |

Gate: items 1–4 must work end to end before I touch 6+. Item 8 is not started with item 4 unfinished.

## Decided to skip

- Project-level and job-level stats (task only).
- Counting individual track keyframes; a track counts as one object.
- Tags (`LabeledImage`) are reported separately, not mixed into shape counts.
- Caching the counts — only if the objective is missed and I have time.
- Frontend unit tests; backend gets a small API test only if time allows.

## Risks

- Docker not installed when I started — setup time could eat into the budget.
- Uploading 5,000 COCO images may be slow on this machine; the image count actually used is recorded in Objectives.
- Naming the app `test` may clash with test discovery/stdlib `test`; check early, note outcome.

## Changes to this plan

- **Setup took the first ~45 min, not 0.** Docker was not installed. While it installed I wrote items 1–4 against the
  code I had read, then verified once the stack was up. The 500 on every authenticated request (CVAT's list filter
  backends read `search_fields`) was only found then — fixed in its own commit.
- **Ran my code on the prebuilt image instead of building it.** `cvat/server:dev` with this branch's `cvat/` bind-mounted
  over `/opt/cvat/cvat` (a local compose override, not committed), UI from the webpack dev server on :3000. A source
  build would have cost ~30 min for no difference in what runs.
- **Line endings.** Git on Windows checked out CRLF; set `core.autocrlf=false` for this repo so scripts that end up in
  Linux containers stay LF.
- **Counts are shapes, not COCO objects.** Expected 36,781 (COCO annotations), got 41,866. Cause: the importer splits
  multi-polygon annotations into separate shapes. Rebuilding objects from `group` does not work (gives 33,346 — group
  ids are reused across frames), so the endpoint counts what the database holds and the UI says "annotations".
- **Data used:** all 5,000 val2017 images, one task, `segment_size=500` (10 jobs).

## Decision record

(Item 10 — written when reached.)
