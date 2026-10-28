# Objectives

Environment for every number below: Intel i5-12450H, 15.7 GB RAM, Windows 11 Home build 26200,
Docker Desktop (WSL2), CVAT commit `e3ae81e36a98bcc69c1549f6f96c7a193f12b9cd`.

## MO-1 — Stats endpoint latency

| Field | Entry |
|---|---|
| What is measured | Wall time of `GET /api/annotation-stats?task_id=<id>` as seen by the client, from request sent to last byte received. |
| How | `curl -w "%{time_total}"` against `http://localhost:8080`, authenticated with a token. One run = 1 discarded warm-up request + 20 timed requests; the run's result is the p95 of the 20. 5 runs. Report median of the 5 run-p95s and the spread (min–max). Script: `docs/bench/mo1.sh`. |
| Target | Median p95 ≤ **150 ms** for a task holding the COCO val2017 annotations (see "Data" below). |
| Conditions | Local Docker stack, default `docker-compose.yml`, nothing else running in CVAT, superuser token, task already imported, no annotation edits during the run. |
| Not included | First request after a server restart (cold Python imports); UI rendering time; the WebSocket path. |

**Why 150 ms.** The request does two things: one OPA permission call (an HTTP round-trip inside Docker) and one
`GROUP BY` over the shapes of the task. CVAT's own task-list request is the comparison: if a per-class
summary is slower than opening the task list, nobody will keep the page open. 150 ms leaves ~100 ms for the
query on ~36k shapes, which a naive ORM loop (load every shape into Python) would not meet — so the target
forces the aggregation to be done in SQL.

**Data.** COCO 2017 val: <N> images, <M> shapes imported (filled in after import).

### Results

(Raw output pasted here after measuring.)
