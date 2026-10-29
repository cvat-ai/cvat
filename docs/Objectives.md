
@'
# Objectives

## Measurable Performance Objective

- **Objective:** The annotation-count API should return a response in a median of 500 ms or less.
- **Endpoint:** `GET /api/tasks/{task_id}/annotation-counts`
- **Measurement method:** Time five sequential authenticated requests to the same task on the local CVAT instance.
- **Target:** Median response time <= 500 ms.
- **Conditions:** Local Docker-based CVAT instance, same task and machine.
- **Exclusions:** Docker startup, browser rendering, and unrelated network traffic.

## Machine and Version

- **Operating system:** Microsoft Windows 11 Pro, version 10.0.26300, 64-bit
- **CPU:** Intel Core i7-1355U, 10 cores, 12 logical processors
- **RAM:** 15.53 GB
- **Starting CVAT commit:** `4a09e27ff869b7aebbfdb07b29c4a34904a0221d`
- **Commit before this documentation update:** `76edda01e`

## Results

Performance measurements have not yet been collected.

| Run | Response time (ms) |
|---|---:|
| 1 | Pending |
| 2 | Pending |
| 3 | Pending |
| 4 | Pending |
| 5 | Pending |

- **Median:** Pending
- **Spread (minimum-maximum):** Pending
- **Target met?:** Pending
- **Raw measurement output:** To be added from actual test results.
'@ | Set-Content docs/Objectives.md
