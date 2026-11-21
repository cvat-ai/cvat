# Objectives: Annotation Analytics

## Environment

- CPU: Intel Core i5-1145G7
- RAM: 16 GB
- OS: Windows 11 Pro
- Docker: Docker Desktop, WSL 2 backend
- Docker allocation: 4 CPUs, approximately 5 GB RAM
- CVAT commit SHA at clone: d4d08dedb5ad7c5e980c0bc7319a7f5587365dad
- Dataset: COCO 2017 validation
- Task image count: 500 (task #4, `coco-val-500`)

## MO-1: Per-class count endpoint latency

| Field | Entry |
|-------|-------|
| What is measured | Total server response time of the task-scoped per-class annotation count endpoint |
| How | Run one warm-up request, then 5 requests with `curl.exe -s -o NUL -w "%{time_total}\n"` using the same valid API token. Save the complete raw output in `docs/evidence/mo1-runs.txt`. Calculate median, minimum and maximum from those 5 values. |
| Target | Median of 5 runs at or below 500 ms |
| Why this target | The endpoint should run one aggregate query (GROUP BY label) in the database, so time is mostly HTTP, auth and one query. 500 ms leaves room for Docker on WSL 2 with about 5 GB RAM. A target like 2 s would be met without any effort and would show nothing. |
| Conditions | Local Docker Compose stack, COCO 2017 validation task (image count as stated in Environment), valid API token, one warm-up request before measurement, containers started and ready, no other heavy workload running |
| Not included | Video tasks, browser rendering time, first request after a cold start, network latency outside the local machine, import and task-creation time |

## Reporting

Median, minimum and maximum of the 5 runs, with raw output in
`docs/evidence/mo1-runs.txt`, added after measurement. All values come
from this machine and the submitted implementation.