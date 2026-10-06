# Objectives

Measurable targets for this assessment. At least one objective required (assessment §6).

**Machine context:**

| Field | Value |
|-------|--------|
| CPU | Intel(R) Core(TM) i7-6820HQ CPU @ 2.70GHz |
| RAM | 15.9 GB |
| OS | Microsoft Windows 11 Pro |
| CVAT commit | `98ee84d0fb5f677d31acf71ec5f797f560f00f5f` |
| Sample data | COCO val2017; **5000** frames in task **8** (`test_task`) |

---

## MO-1 — API endpoint latency

| Field | Entry |
|-------|--------|
| **What is measured** | End-to-end time for an authenticated `GET /api/test/tasks/8/class-counts` until the full JSON response is returned (Django `APIClient` inside `cvat_server`, warm process). |
| **How** | `rest_framework.test.APIClient` with `force_authenticate` as task owner `Ameer_JS`; 2 warmup calls discarded; then 5 timed runs with `time.perf_counter()`. |
| **Target** | Median of 5 runs **≤ 100 ms**. |
| **Conditions** | Local Docker stack, task 8 (~41866 annotations, 80 classes), warm DB, no other heavy jobs, measurement from inside `cvat_server` (not browser). |
| **Not included** | Cold start after `docker compose down`, first request after container recreate, browser/network via Traefik, WebSocket path. |

### Raw runs

```
Method: APIClient GET /api/test/tasks/8/class-counts (authenticated), 2 warmups discarded
Run 1: 68.42 ms (200, 2562 bytes)
Run 2: 60.11 ms (200, 2562 bytes)
Run 3: 61.82 ms (200, 2562 bytes)
Run 4: 64.72 ms (200, 2562 bytes)
Run 5: 79.65 ms (200, 2562 bytes)

Median: 64.72 ms
Spread (min–max): 60.11 .. 79.65 ms
Mean: 66.94 ms
Target met? yes — median 64.72 ms ≤ 100 ms
```

### Target justification

100 ms is a practical ceiling for this local Docker stack returning ~42k annotation aggregates over 80 COCO classes: fast enough to feel responsive for a task analytics page, but not a trivial no-op. Clearing it required a real DB aggregation path, not an empty stub.
