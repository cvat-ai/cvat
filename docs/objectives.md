# Objectives: Annotation Analytics

## Environment

- CPU: Intel Core i5-1145G7
- RAM: 16 GB
- OS: Windows 11 Pro
- Docker: Docker Desktop, WSL 2 backend
- Docker allocation: 4 CPUs, 3.76 GiB RAM
- CVAT commit SHA at clone: d4d08dedb5ad7c5e980c0bc7319a7f5587365dad
- Dataset: COCO 2017 validation
- Task image count: 500 (task #4, `coco-val-500`)

## MO-1: Per-class count endpoint latency

| Field | Entry |
|-------|-------|
| What is measured | Total server response time of the task-scoped per-class annotation count endpoint |
| How | Run one warm-up request, then 5 requests with `curl.exe -s -o NUL -w "%{http_code} %{time_total}\n"` using the same valid API token. Capture the five outputs in `docs/evidence/mo1-console.png`. Calculate median, minimum and maximum from those 5 values. Each output line is `<status> <time_total>`; a run counts only if the status is 200. |
| Target | Median of 5 runs at or below 500 ms |
| Why this target | The endpoint should run one aggregate query (GROUP BY label) in the database, so time is mostly HTTP, auth and one query. 500 ms leaves room for Docker on WSL 2 with 3.76 GiB allocated RAM. A target like 2 s would be met without any effort and would show nothing. |
| Conditions | Local Docker Compose stack, COCO 2017 validation task (image count as stated in Environment), valid API token, one warm-up request before measurement, containers started and ready, no other heavy workload running |
| Not included | Video tasks, browser rendering time, first request after a cold start, network latency outside the local machine, import and task-creation time |

## Reporting

Evidence screenshot: `docs/evidence/mo1-console.png` (5 runs after one warm-up,
each line shows HTTP status and seconds).

- Runs (ms): 146.7, 223.2, 82.0, 206.8, 274.7 (all HTTP 200)
- Median: 206.8 ms, minimum: 82.0 ms, maximum: 274.7 ms
- Target (median at or below 500 ms): met.

The spread is wide (82 to 275 ms) on this laptop with Docker on WSL 2. The
task has 3,953 shapes in 78 classes. An earlier attempt was discarded because
the token had been pasted with angle brackets, so every request returned 401
and the times were those of error responses; status codes are now logged
next to each time.