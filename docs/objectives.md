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

To compare, I also measure the old way of getting these numbers: download all annotations of the task and count them. I measure this before writing my API.

### Result

| | Run 1 | Run 2 | Run 3 | Run 4 | Run 5 | Median | Spread |
|---|---|---|---|---|---|---|---|
| Old way | | | | | | | |
| My API | | | | | | | |

Target met: _to fill in_
Raw output: _to paste here_

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

| | Run 1 | Run 2 | Run 3 | Run 4 | Run 5 | Median | Spread |
|---|---|---|---|---|---|---|---|
| Chart update | | | | | | | |

Target met: _to fill in_
Raw output: _to paste here_
