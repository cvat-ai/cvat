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

| # | Step | Budget | Actual (commit times, filled in at the end) |
|---|---|---|---|
| 0 | Docs: this Plan, Objectives draft, Definition of Done — committed before code | 0:30 | 16:47–16:48, written after ~25 min reading the code |
| 1 | Django app `cvat.apps.test`: `GET /api/annotation-stats?task_id=` — one aggregate query, `GROUP BY label` | 1:00 | written by 16:51, working 17:25 (Docker install in between). URL became `/api/annotation-stats/<task_id>` to use DRF's detail-route permission check |
| 5 | Same endpoint: CVAT session/token auth + task view permission. Demonstrate 401 and 403 with curl | 0:30 | in the same commit; evidence 17:49 |
| 2–4 | UI page `/tasks/:id/annotation-stats`, link in task Actions menu, bar chart, empty state and error state with retry | 1:30 | 17:09, chart fix 17:48 |
| 6 | MO-1 latency objective: script, 5 runs, raw output in `docs/OBJECTIVES.md` | 1:00 | 17:52 |
| 7 | Grouping: counts split by shape type (rectangle / polygon / mask …) per class, stacked bars | 0:45 | 17:59 |
| 8 | Live updates: `Task` post_save → Redis pub/sub → raw ASGI WebSocket → page re-fetches | 1:30 | backend 18:04, page 18:35 |
| 9 | Reconnect with backoff, connection status shown on page | (in 8) | 18:35, after one failed test run (below) |
| 10 | Decision record (below), DoD evidence, PR into my fork | 0:45 | 18:35–18:45 |

Total about 2 h of the 8 h. I built with an AI coding assistant, which the brief allows; that is most of the
difference from the budget. The budgets above are what I expected to need without one.

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
- **Item 9's first test failed, and the page was not at fault.** The page sat on "Reconnecting…" past my 120 s
  timeout. A browser trace showed the retries running as designed (backoff ~2, 4, 8, 15 s), each getting a 502. The
  server takes ~130 s to restart here, because it re-runs migrations and collectstatic with the code bind-mounted from
  a OneDrive folder. Re-ran with a longer allowance and timed "server reachable" against "page live" separately.
- **Data used:** all 5,000 val2017 images, one task, `segment_size=500` (10 jobs).

## Decision record — how the page learns that counts changed (items 8–9)

**Took:** a `post_save` receiver on `Task`, filtered to `touch()` (what every annotation write calls), publishes
the task id to Redis pub/sub on commit. A ~100-line raw ASGI handler (`cvat/apps/test/live.py`), wrapped around
Django's app in `cvat/asgi.py`, holds the socket. It sends only `{"type": "changed"}`, and the page re-fetches
over REST. The socket is authorised by a signed 60-second ticket that the REST response hands out after the
normal OPA check.

**Rejected:** Django Channels: a `ProtocolTypeRouter`, an `AsyncWebsocketConsumer` using `AuthMiddlewareStack`
for the session, `channels_redis` groups, with the new counts pushed in the message.

**Why:** Channels and channels-redis are two new pinned dependencies, so I would have to regenerate
`cvat/requirements/*.txt` and rebuild the server image (I am running the prebuilt image with my code mounted).
The consumer would also need its own task-permission check outside DRF, which means a second copy of what OPA
already decides. uvicorn already speaks WebSocket and Redis is already there.

**What rejecting it cost:**
- **An extra round trip per change.** Each burst of changes costs every open page one REST call (~110 ms, and a
  23–33 ms query on the server) instead of the counts arriving in the message. With many viewers on one busy task
  that is N queries per burst. The 300 ms debounce limits it but does not remove it.
- **Hand-rolled plumbing I own.** No groups abstraction, no consumer test utilities, no auth middleware. Anyone
  maintaining it has to read `live.py`. A second real-time feature would push me towards Channels anyway.
- **Revocation is not instant.** An open socket keeps receiving "changed" pings after the user loses access until it
  closes. Nothing leaks, because the re-fetch then gets a 403, but the socket itself is not cut.
- **Spurious events.** `touch()` also fires on task edits that do not change counts, so some pings re-fetch for
  nothing.
