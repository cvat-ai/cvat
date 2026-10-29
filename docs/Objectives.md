@'
# Objectives

## Measurable Performance Objective

- **Objective:** The annotation-count API should return a response in a median of 500 ms or less.
- **Endpoint:** `GET /api/tasks/{task_id}/annotation-counts`
- **Measurement method:** Time five authenticated requests to the same task using the local CVAT instance. Record every response time in milliseconds.
- **Target:** Median response time <= 500 ms.
- **Conditions:** Local Docker-based CVAT instance, same task, same machine, sequential requests.
- **Exclusions:** Docker startup time, browser rendering time, and unrelated network traffic.

## Machine and Version

- **Operating system:** Microsoft Windows 11 Pro, version 10.0.26300, 64-bit
- **CPU:** TODO - record actual CPU model and core counts
- **RAM:** 15.53 GB
- **Starting CVAT commit:** `4a09e27ff869b7aebbfdb07b29c4a34904a0221d`
- **Current feature branch commit at documentation start:** `c0ff3e150fbfe996ed9798e97a858182674d73ba`

## Results

Measurements not yet collected.

| Run | Response time (ms) |
|---|---:|
| 1 | TODO |
| 2 | TODO |
| 3 | TODO |
| 4 | TODO |
| 5 | TODO |

- **Median:** TODO
- **Spread (minimum-maximum):** TODO
- **Target met?:** TODO
- **Raw measurement output:** TODO - paste actual output here
'@ | Set-Content docs/Objectives.md