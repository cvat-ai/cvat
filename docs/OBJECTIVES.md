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

**Data.** COCO 2017 val: all **5,000 images** in one task (10 jobs of 500), `instances_val2017.json` imported as
COCO 1.0 → **41,866 shapes** (41,420 polygons, 446 masks) over 80 labels.

### Result — target met (median p95 105.5 ms ≤ 150 ms)

Run on 2026-10-28 ~17:52, `bash docs/bench/mo1.sh 2 admin <password>`. Raw output:
[results/mo1_baseline.txt](bench/results/mo1_baseline.txt)

```
run 1 p95_ms: 101.5
run 2 p95_ms: 105.5
run 3 p95_ms: 113.8
run 4 p95_ms: 91.6
run 5 p95_ms: 105.8
median of run p95s: 105.5 ms   spread: 91.6 .. 113.8 ms
```

**Met on the first measurement, with no optimisation work.** The target was committed before any code
(`f683d7c37`), and I have not moved it after seeing the number. So the result says the design choice was right,
not that I tuned anything. To check the reasoning behind the 150 ms rather than just the number, I timed the parts
of the request inside the server ([mo1_breakdown.py](bench/mo1_breakdown.py), raw:
[results/mo1_breakdown.txt](bench/results/mo1_breakdown.txt)):

| Part | Median | Share of the 105 ms |
|---|---|---|
| SQL `GROUP BY label_id` over 41,866 shapes (`stats.py`) | 23.4 ms | ~22% |
| OPA permission check (HTTP call to `cvat_opa`) | 1.8 ms | ~2% |
| Everything else: Traefik → nginx → uvicorn, Django middleware, token auth, Docker Desktop networking on Windows | ~80 ms | ~76% |
| *Rejected alternative:* load every shape and count in Python | *1,088 ms* | *would miss the target ~7×* |

What this tells me:
- The justification held: the aggregation has to happen in SQL. Counting in Python is 46× slower than the query.
- The OPA call I worried about is negligible (1.8 ms). Caching the permission result would gain nothing.
- Most of the remaining time is not in my code. Caching the counts would save at most the ~23 ms query, and the page
  would then have to deal with stale data. Not worth it at this size.
- **Where it would break:** the query scales with the shape count of one task. At ~40k shapes it takes 23 ms, so a
  task around 10× larger (~400k shapes) would put the query near the whole budget. That is the point where a
  precomputed count (updated on the same `touch()` signal as item 8) would pay for itself.

### Re-measured after item 7 (split by shape type) — still met

Grouping by `(label_id, type)` instead of `label_id` is the only change to the query.

| | Before item 7 | After item 7 |
|---|---|---|
| MO-1 median p95 (spread) | 105.5 ms (91.6–113.8) | **115.5 ms (106.8–120.4)** |
| SQL aggregation alone | 23.4 ms | 33.5 ms |

Raw: [mo1_after_by_type_rerun.txt](bench/results/mo1_after_by_type_rerun.txt),
[mo1_breakdown_after_by_type.txt](bench/results/mo1_breakdown_after_by_type.txt).
The grouping costs ~10 ms of query time. A first run straight after a browser test gave 117.8 ms with one run at
161 ms ([mo1_after_by_type.txt](bench/results/mo1_after_by_type.txt)); the server-side split showed the query had only
moved 10 ms, so I re-ran on a quiet machine. Both runs are kept.
