# Objectives

The target below was set before the endpoint was implemented or measured. I will not change the target after seeing the results. If the target is missed, the measured result and reason will be reported.

## Environment

| Item | Value |
|---|---|
| CPU | Intel Core i5-6300U @ 2.40 GHz (2 cores, 4 threads) |
| RAM | 7,839 MB total |
| OS | Windows 10 Pro, 10.0.19045 |
| Docker Desktop | 4.94.0 |
| CVAT base commit | `f3c7c5b3e6cf5f8d64e39aa73625899e55dd481e` |
| Data | COCO 2017 val, 5000 images, official `instances_val2017.json` imported as COCO 1.0, task `coco-5000` |
| Docker memory during measurement | To be recorded with `docker stats --no-stream` |

## MO-1: Annotation-count endpoint response time

| Field | Entry |
|---|---|
| ID | MO-1 |
| What is measured | Total response time for an authenticated GET request to the annotation-count endpoint for `coco-5000`, from request sent until the response is received. |
| How | `curl.exe` using `time_total`. One warm-up request is discarded, followed by 5 timed requests. Raw command output is saved in `docs/evidence/mo-1-raw.txt`. |
| Target | **Median of 5 runs at or below 250 ms, with no individual run above 500 ms.** |
| Conditions | Local Docker stack, CVAT built from this branch, `coco-5000` loaded, authenticated request, same machine described above. |
| Not included | First request after a cold start, UI rendering, WebSocket delivery and other machines. |

## Why this target

The endpoint must authenticate the request, verify access to the task and perform a grouped database count over the task's annotations.

I chose 250 ms as a deliberately tight target for an interactive local analytics request, with 500 ms as the maximum acceptable individual run. The target was chosen before implementing or timing the endpoint.

If the endpoint misses the target, I will report the result and investigate the cause rather than changing the target.

## Results

Not measured yet. Item 6 remains incomplete.

| Run | Time (ms) |
|---|---:|
| 1 | |
| 2 | |
| 3 | |
| 4 | |
| 5 | |

**Median:**
**Spread (min–max):**
**Target met:**

### Raw evidence

`docs/evidence/mo-1-raw.txt`

The evidence file will contain the exact measurement command and the raw output from all five measured runs.
