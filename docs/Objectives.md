
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


## Performance Results

Endpoint: `GET /api/tasks/1/annotation-counts`

Method: Five sequential authenticated HTTP requests against the local Docker instance.

Raw response times (milliseconds):
- Run 1: 1938.53
- Run 2: 1046.49
- Run 3: 1149.18
- Run 4: 1157.75
- Run 5: 1039.39

- Median: 1149.18 ms
- Spread (maximum - minimum): 899.14 ms
- Target: Median <= 500 ms
- Result: **Not met**. The observed median was 1149.18 ms.

Limitations: These are five local measurements and may be affected by Docker startup state, authentication, and machine load. No warm-up requests were excluded.

'@ | Set-Content docs/Objectives.md
