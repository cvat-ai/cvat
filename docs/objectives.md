# Objectives

These are the targets I set myself before writing code, and how each one is measured. Measurements are only
added, never replaced. Each run gets its own dated entry in the measurement log, so earlier results stay visible
next to later ones.

## Environment

| | |
|---|---|
| CPU | Intel Core i5-3470 @ 3.20 GHz, 4 cores |
| RAM | 5 GB limit for WSL2 (4.8 GiB visible), plus 8 GB swap |
| OS | Ubuntu 26.04.1 LTS on WSL2 (kernel 6.18), Windows host |
| Docker | 29.9.2, Compose v5.6.1 |
| CVAT commit | `b36a49bd5cc7e5fe3fc36ecb6036659c8136b780`, the base of branch `dev-test01` |
| Server image | Built locally (`docker compose -f docker-compose.yml -f docker-compose.dev.yml build cvat_server`) |
| Data | COCO val2017, `instances_val2017.json`. Counts are logged in the data log below. |

### Data log

| Time (PKT) | Images in task | Annotations imported | Labels | Jobs (segment size 500) | Task id |
|------------|----------------|----------------------|--------|-------------------------|---------|

## Counting rule (what "one annotation" means)

- **What counts as one annotation:**
  - one top-level shape,
  - one track (the whole track, not each of its keyframes),
  - one tag.

  They are grouped by label.
- **Not counted:** skeleton elements (they are parts of a parent skeleton shape), track keyframes and intervals.
- **Jobs counted:**
  - Annotation jobs.
  - Ground-truth jobs, but only when the task uses a ground-truth pool.
  - Consensus replica jobs are never counted.

  This is the same set CVAT uses for a task's own annotations (`cvat/apps/dataset_manager/task.py:1033`), so
  the counts can be compared with CVAT's own data.
- **With `job_id`:** only that job is counted.

## MO-1: endpoint response time (required speed target)

| ID | Field | Entry |
|----|-------|-------|
| MO-1 | What is measured | Total time for `GET /api/label-counts?task_id=<id>` to return the full per-label result for the COCO task, as seen by the client. |
| | How | `curl -s -o /dev/null -w '%{http_code} %{time_total}\n' -H "Authorization: Token $TOKEN" "http://localhost:8080/api/label-counts?task_id=<id>"`, run 5 times in a row after one warm-up request. Token auth, not Basic, because Basic auth hashes the password on every request, which would measure password hashing rather than the endpoint. |
| | Target | Median of 5 runs at or below **100 ms**, every run HTTP 200. |
| | Why this number | The live graph refetches this endpoint after every save, and about 100 ms is the usual limit for a response to feel instant. Loading every annotation through CVAT's normal annotation loader and counting in Python would take far longer on tens of thousands of rows, so the target can only be met if the database does the counting. |
| | Conditions | Local Docker stack, Traefik on :8080, the COCO task only, browser closed, nothing else running, no other requests. |
| | Not included | The first request after a server restart (the warm-up), page render time, and any network beyond localhost. |

## MO-2: counts are correct (checked against a known source)

| ID | Field | Entry |
|----|-------|-------|
| MO-2 | What is measured | For every label, the difference between the endpoint's count and the number of annotations with that category in `instances_val2017.json`, for the images in the task. |
| | How | A Python one-off reads the COCO file and counts annotations per category name for the uploaded images. Its output and the endpoint's JSON are compared label by label. A second check is a direct SQL GROUP BY over `engine_labeledshape` for the task. All three raw outputs are pasted into the measurement log. |
| | Target | **0 labels with a difference**, out of 80, and the totals are equal. |
| | Why this number | The count is the product. Any difference means the rule above is wrong somewhere, for example double counting or a missed table, so anything other than an exact match fails. |
| | Conditions | The COCO task straight after import, before anyone edits it. |
| | Not included | Tasks with tracks, tags or skeletons. COCO has none of these, so those parts of the rule are covered by the backend tests instead. |

## MO-3: live update delay (only if item 8 is built)

| ID | Field | Entry |
|----|-------|-------|
| MO-3 | What is measured | Time from the response to saving an annotation change in a job, to the response of the page's refetch of the counts. |
| | How | Chrome DevTools, Network panel with the WebSocket frames shown. Take the timestamp of the save request's response and the timestamp of the next `label-counts` response. Repeat for 5 saves. |
| | Target | Median of 5 at or below **2 s**. |
| | Why this number | 2 s still feels live to someone watching the chart while a colleague annotates. The page waits 500 ms to group several quick saves into one refetch, which leaves about 1.5 s for the notification and the refetch. |
| | Conditions | Same stack as MO-1, the job and the chart open in two tabs of the same browser, one change per save. |
| | Not included | Reconnect time after a dropped connection (that is checked as pass/fail in the Definition of Done). |

## Results summary

| ID | Target | Result | Met? | Evidence |
|----|--------|--------|------|----------|
| MO-1 | median ≤ 100 ms | | | |
| MO-2 | 0 differing labels | | | |
| MO-3 | median ≤ 2 s | | | |

## Measurement log (added, never rewritten)

Each entry has this shape: `### <ID>, run <n>, <date time PKT>, code at <commit>`, then the raw output exactly
as printed, then the median and spread (min to max), then met or missed and why.
