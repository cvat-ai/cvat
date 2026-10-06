# Objectives — Annotation Analytics

## Test setup

All numbers in this file were measured on this computer, with this data.

| | |
|---|---|
| Computer | Intel Core i5-10210U (4 cores), 15.8 GB RAM, Windows 11 Pro |
| Docker | Version 29.4.3, allowed 8 cores and 7.6 GB RAM |
| CVAT | Commit `d8193c584be9ce6cf9882dad06c0dd920cc0b9c5` (version 2.77.1) |
| Data | Task 1: 1000 COCO pictures with 7,204 labelled objects |

Each test is run 5 times. For each test I report:

- **Median:** the middle result when the 5 results are sorted.
- **Spread:** the slowest result minus the fastest result.

---

## MO-1 — How fast the API returns the counts

| Field | Entry |
|---|---|
| What is measured | The time the API takes to return the label counts for task 1. |
| How | A script calls the API with `curl`, which prints the time of each call. The first call is not counted. The next 5 calls are recorded. |
| Target | Median of 100 ms or less. |
| Why this target | The page asks for the counts again every time the chart updates, so the answer must come back quickly. A response under 100 ms feels instant. |
| Conditions | CVAT running in Docker on this computer. Logged in before the test starts. No one editing annotations during the test. |
| Not included | The first call after the server starts. The time the page takes to draw the chart. |

To compare, I also measure the old way of getting these numbers: download all annotations of the task and count them. (I planned to measure this before writing my API but did it afterwards; see "Changes to this plan" in `plan.md`.)

### Result

Measured with `cvat/apps/test/measure_latency.sh` on 6 October 2026, with only CVAT running in Docker.

| | Run 1 | Run 2 | Run 3 | Run 4 | Run 5 | Median | Spread |
|---|---|---|---|---|---|---|---|
| Old way | 1029 ms | 1515 ms | 1417 ms | 1131 ms | 1261 ms | 1261 ms | 487 ms |
| My API | 99 ms | 103 ms | 57 ms | 66 ms | 147 ms | **99 ms** | 90 ms |

**Target met, but only just:** the median is 99.2 ms against a target of 100 ms. The spread is large (57 to 147 ms), so another set of 5 runs could easily land above 100 ms. I report this one set as measured and did not re-run it to get a better number.

My API is about **13 times faster** than the old way (99 ms against 1261 ms).

**Where the time goes.** I also timed only the counting itself, inside the server, 5 times: 15.6, 16.7, 15.7, 15.3 and 14.3 ms (median 15.6 ms, spread 2.4 ms). So the database counting takes about 16 ms and is steady. The other ~80 ms, and almost all of the variation, is the rest of the request: checking the login, CVAT's permission check (a separate service), and Docker's network on Windows. Making the counting faster would not change the result much. Most of the time is spent outside my code.

Raw output:

```
Measured at 2026-10-06 15:52:59 UTC, task 1, 5 runs each
Old way (download all annotations): http://localhost:8080/api/tasks/1/annotations
  run 1: 1.028685 s
  run 2: 1.515357 s
  run 3: 1.416504 s
  run 4: 1.130505 s
  run 5: 1.260827 s
  median 1260.8 ms, spread 486.7 ms (fastest 1028.7 ms, slowest 1515.4 ms)
Annotation counts API: http://localhost:8080/api/test/tasks/1/annotation-counts
  run 1: 0.099192 s
  run 2: 0.102661 s
  run 3: 0.056914 s
  run 4: 0.065719 s
  run 5: 0.146519 s
  median 99.2 ms, spread 89.6 ms (fastest 56.9 ms, slowest 146.5 ms)
```

Counting only (inside the server, Django shell):

```
counting only, ms: [15.6, 16.7, 15.7, 15.3, 14.3]
median 15.6 ms, spread 2.4 ms
```

---

## MO-2 — How fast the chart updates by itself

Only measured if I finish plan step 9.

| Field | Entry |
|---|---|
| What is measured | The time from saving a new annotation to the page receiving the new counts. |
| How | A script keeps the page's connection open, saves one annotation, and records how long the new counts take to arrive. Done 5 times. |
| Target | Median of 1 second or less. |
| Why this target | A user who adds an annotation should see the chart change straight away. |
| Conditions | Same as MO-1. |
| Not included | The time to reconnect after the connection drops. |

### Result

Measured with `cvat/apps/test/measure_live_update.js` on 6 October 2026, on task 2 (an empty task: each run adds one box and deletes it again), with only CVAT running in Docker. Each run times what the page does: save a box, wait for the "changed" message, then reload the counts and check that the box is included.

| | Run 1 | Run 2 | Run 3 | Run 4 | Run 5 | Median | Spread |
|---|---|---|---|---|---|---|---|
| Chart update | 243 ms | 248 ms | 225 ms | 240 ms | 320 ms | **243 ms** | 95 ms |

**Target met, with a wide margin:** the median is 243 ms against a target of 1 second. This target was easy to reach. The time includes saving the box itself, which CVAT does before my code is involved, and one reload of the counts (about 100 ms, see MO-1).

Raw output:

```
Measured at 2026-10-06T17:33:42.655Z, task 2, 5 runs
  run 1: 243.2 ms
  run 2: 247.5 ms
  run 3: 224.8 ms
  run 4: 239.7 ms
  run 5: 320.0 ms
  median 243.2 ms, spread 95.2 ms (fastest 224.8 ms, slowest 320.0 ms)
```
