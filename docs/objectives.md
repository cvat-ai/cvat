# Objectives

These are the targets I set myself before writing code, and how each one is measured. Measurements are only
added, never replaced. Each run gets its own dated entry in the measurement log, so earlier results stay visible
next to later ones.

## Environment

| | |
|---|---|
| CPU | Intel Core i5-3470 @ 3.20 GHz, 4 cores |
| RAM | 5 GB limit for WSL2 (4.8 GiB visible), plus 8 GB swap |
| OS | Ubuntu 26.04.1 LTS on WSL2 (kernel 6.18), Windows host |
| Docker | 29.9.2, Compose v5.6.1 |
| CVAT commit | `b36a49bd5cc7e5fe3fc36ecb6036659c8136b780`, the base of branch `dev-test01` |
| Server image | Built locally (`docker compose -f docker-compose.yml -f docker-compose.dev.yml build cvat_server`) |
| Data | COCO val2017, `instances_val2017.json`. Counts are logged in the data log below. |

### Data log

| Time (PKT) | Images in task | Annotations imported | Labels | Jobs (segment size 500) | Task id |
|------------|----------------|----------------------|--------|-------------------------|---------|
| 17:14 | 5000 | 36,781 COCO instances, stored by CVAT as 41,866 shapes (41,420 polygons, 446 masks) | 80 | 10 | 1 |

## Counting rule (what "one annotation" means)

- **What counts as one annotation:**
  - one top-level shape,
  - one track (the whole track, not each of its keyframes),
  - one tag.

  They are grouped by label.
- **Not counted:** skeleton elements (they are parts of a parent skeleton shape), track keyframes and intervals.
- **Jobs counted:**
  - Annotation jobs.
  - Ground-truth jobs, but only when the task uses a ground-truth pool.
  - Consensus replica jobs are never counted.

  This is the same set CVAT uses for a task's own annotations (`cvat/apps/dataset_manager/task.py:1033`), so
  the counts can be compared with CVAT's own data.
- **With `job_id`:** only that job is counted.

## MO-1: endpoint response time (required speed target)

| ID | Field | Entry |
|----|-------|-------|
| MO-1 | What is measured | Total time for `GET /api/label-counts?task_id=<id>` to return the full per-label result for the COCO task, as seen by the client. |
| | How | `curl -s -o /dev/null -w '%{http_code} %{time_total}\n' -H "Authorization: Token $TOKEN" "http://localhost:8080/api/label-counts?task_id=<id>"`, run 5 times in a row after one warm-up request. Token auth, not Basic, because Basic auth hashes the password on every request, which would measure password hashing rather than the endpoint. |
| | Target | Median of 5 runs at or below **100 ms**, every run HTTP 200. |
| | Why this number | The live graph refetches this endpoint after every save, and about 100 ms is the usual limit for a response to feel instant. Loading every annotation through CVAT's normal annotation loader and counting in Python would take far longer on tens of thousands of rows, so the target can only be met if the database does the counting. |
| | Conditions | Local Docker stack, Traefik on :8080, the COCO task only, browser closed, nothing else running, no other requests. |
| | Not included | The first request after a server restart (the warm-up), page render time, and any network beyond localhost. |

## MO-2: counts are correct (checked against a known source)

| ID | Field | Entry |
|----|-------|-------|
| MO-2 | What is measured | For every label, the difference between the endpoint's count and the number of annotations with that category in `instances_val2017.json`, for the images in the task. |
| | How | A Python one-off reads the COCO file and counts annotations per category name for the uploaded images. Its output and the endpoint's JSON are compared label by label. A second check is a direct SQL GROUP BY over `engine_labeledshape` for the task. All three raw outputs are pasted into the measurement log. |
| | Target | **0 labels with a difference**, out of 80, and the totals are equal. |
| | Why this number | The count is the product. Any difference means the rule above is wrong somewhere, for example double counting or a missed table, so anything other than an exact match fails. |
| | Conditions | The COCO task straight after import, before anyone edits it. |
| | Not included | Tasks with tracks, tags or skeletons. COCO has none of these, so those parts of the rule are covered by the backend tests instead. |

## MO-3: live update delay (only if item 8 is built)

| ID | Field | Entry |
|----|-------|-------|
| MO-3 | What is measured | Time from the response to saving an annotation change in a job, to the response of the page's refetch of the counts. |
| | How | Chrome DevTools, Network panel with the WebSocket frames shown. Take the timestamp of the save request's response and the timestamp of the next `label-counts` response. Repeat for 5 saves. |
| | Target | Median of 5 at or below **2 s**. |
| | Why this number | 2 s still feels live to someone watching the chart while a colleague annotates. The page waits 500 ms to group several quick saves into one refetch, which leaves about 1.5 s for the notification and the refetch. |
| | Conditions | Same stack as MO-1, the job and the chart open in two tabs of the same browser, one change per save. |
| | Not included | Reconnect time after a dropped connection (that is checked as pass/fail in the Definition of Done). |

## Results summary

| ID | Target | Result | Met? | Evidence |
|----|--------|--------|------|----------|
| MO-1 | median ≤ 100 ms | run 1: 108.7 ms (101.1-335.0); runs 2 and 3, with a trial index: 127.3 ms and 111.7 ms | Missed | Measurement log, MO-1 runs 1-3 |
| MO-2 | 0 differing labels | 0 of 80 against the shapes CVAT stores; 77 of 80 against raw COCO instances | Met for stored shapes (see run 1) | Measurement log, MO-2 run 1 |
| MO-3 | median ≤ 2 s | | | |

## Measurement log (added, never rewritten)

Each entry has this shape: `### <ID>, run <n>, <date time PKT>, code at <commit>`, then the raw output exactly
as printed, then the median and spread (min to max), then met or missed and why.

### MO-2, run 1, 2026-10-29 17:15 PKT, code at `fa40caea7`

Raw output:

```
COCO instances: 36781 | COCO polygon parts + crowd masks: 41866 | endpoint total: 41866
labels differing, endpoint vs COCO instances: 77 of 80
labels differing, endpoint vs COCO polygon parts + crowd masks: 0 of 80
label | endpoint | coco_parts | coco_instances
person | 12451 | 12451 | 11004
car | 2315 | 2315 | 1932
chair | 2141 | 2141 | 1791
book | 1184 | 1184 | 1161
bottle | 1085 | 1085 | 1025
dining table | 960 | 960 | 697
cup | 932 | 932 | 899
bowl | 657 | 657 | 626
traffic light | 653 | 653 | 637
handbag | 598 | 598 | 540
bench | 557 | 557 | 413
skis | 522 | 522 | 241
boat | 477 | 477 | 430
bird | 467 | 467 | 440
truck | 465 | 465 | 415
motorcycle | 462 | 462 | 371
umbrella | 449 | 449 | 413
cow | 432 | 432 | 380
backpack | 430 | 430 | 371
sheep | 415 | 415 | 361
bicycle | 412 | 412 | 316
wine glass | 407 | 407 | 343
banana | 398 | 398 | 379
potted plant | 398 | 398 | 343
carrot | 391 | 391 | 371
couch | 378 | 378 | 261
knife | 366 | 366 | 326
horse | 359 | 359 | 273
remote | 353 | 353 | 283
surfboard | 350 | 350 | 269
kite | 340 | 340 | 336
donut | 339 | 339 | 338
bus | 338 | 338 | 285
cake | 329 | 329 | 316
suitcase | 325 | 325 | 303
zebra | 323 | 323 | 268
elephant | 322 | 322 | 255
broccoli | 321 | 321 | 316
pizza | 314 | 314 | 285
tennis racket | 296 | 296 | 225
orange | 296 | 296 | 287
cell phone | 296 | 296 | 262
spoon | 288 | 288 | 253
tv | 288 | 288 | 288
vase | 287 | 287 | 277
tie | 285 | 285 | 254
sports ball | 280 | 280 | 263
giraffe | 271 | 271 | 232
clock | 267 | 267 | 267
fork | 255 | 255 | 215
laptop | 248 | 248 | 231
apple | 243 | 243 | 239
sink | 238 | 238 | 225
dog | 237 | 237 | 218
bed | 227 | 227 | 163
train | 224 | 224 | 190
teddy bear | 219 | 219 | 191
skateboard | 218 | 218 | 179
cat | 211 | 211 | 202
toilet | 196 | 196 | 179
baseball bat | 185 | 185 | 146
sandwich | 180 | 180 | 177
oven | 161 | 161 | 143
airplane | 160 | 160 | 143
keyboard | 158 | 158 | 153
baseball glove | 149 | 149 | 148
refrigerator | 134 | 134 | 126
frisbee | 129 | 129 | 115
hot dog | 128 | 128 | 127
mouse | 108 | 108 | 106
fire hydrant | 103 | 103 | 101
snowboard | 84 | 84 | 69
stop sign | 80 | 80 | 75
bear | 73 | 73 | 71
toothbrush | 68 | 68 | 57
parking meter | 60 | 60 | 60
microwave | 56 | 56 | 55
scissors | 41 | 41 | 36
hair drier | 14 | 14 | 11
toaster | 10 | 10 | 9
## SQL cross-check (cvat_db)
41866
  name  | count 
--------+-------
 person | 12451
 car    |  2315
 chair  |  2141
 book   |  1184
 bottle |  1085
(5 rows)

```

- **Result:** the endpoint, a direct SQL GROUP BY, and the COCO file all agree exactly, but only when the file
  is counted the way CVAT stores it. Against raw COCO instances, 77 of the 80 labels are higher in CVAT.
- **Why:** one COCO instance can have several polygon parts. CVAT's importer (Datumaro,
  `datumaro/plugins/data_formats/coco/base.py:575-596`, "a single object can consist of multiple parts")
  creates one `Polygon` per part, and each part is saved as its own `LabeledShape` row. Crowd regions become one
  mask each.
- **What this means for the target:** the counting rule stays as written. The endpoint counts annotations as
  CVAT stores them, one row per drawn object, which is also what a user sees and edits in a job. So the target
  is met against the stored shapes (0 of 80 differ). Against the raw instance count it would not be met, and
  that is a property of the import, not of the endpoint.

### MO-1, run 1, 2026-10-29 17:54 PKT, code at `228c452c4`

Raw output:

```
$ curl -s -o /dev/null -w "%{http_code} %{time_total}\n" -H "Authorization: Token $TOKEN" "http://localhost:8080/api/label-counts?task_id=1"   # 1 warm-up, then 5 runs
warm-up: 200 1.614544
200 0.334993
200 0.101101
200 0.103006
200 0.108726
200 0.142357
```

- **Result:** median 108.7 ms, spread 101.1 to 335.0 ms over 5 runs, all HTTP 200. **Missed** the 100 ms target
  by 8.7 ms.
- **Where the time goes**, measured once inside `cvat_server` with Django's query capture:
  `count_annotations_by_label` takes 41-57 ms over 5 calls, and 42 ms of that is the single GROUP BY on
  `engine_labeledshape`. The rest of the request, about 55 ms, is authentication, the OPA policy call, loading
  the task twice (once in the permission, once in the view) and DRF rendering.
- **Why the shapes query costs 42 ms:** `EXPLAIN ANALYZE` shows a bitmap scan through the `job_id` index that
  then reads about 2,300 table blocks per query, once per job. An experimental partial index on
  `(job_id, label_id) WHERE parent_id IS NULL` did not give an index-only scan, because the query counts `id`.
  The index was dropped again, and the measurement was not repeated while other work was running.
- **Next:** measure again on a quiet machine. The likely cheap wins are counting rows rather than ids, so a
  covering index can be used, and loading the task once.

### MO-1, runs 2 and 3, 2026-10-29 18:19 PKT, code at `b07600dcd` plus a trial index (not committed)

The trial was a partial covering index on `engine_labeledshape (job_id, label_id) INCLUDE (id) WHERE parent_id IS
NULL`, added by a migration in `cvat/apps/test`, followed by `VACUUM ANALYZE`. The query plan switched to an
index-only scan.

Run 2 started right after the 24 backend tests had finished:

```
$ curl -s -o /dev/null -w "%{http_code} %{time_total}\n" -H "Authorization: Token $TOKEN" "http://localhost:8080/api/label-counts?task_id=1"   # 1 warm-up, then 5 runs
warm-up: 200 0.788679
200 0.135732
200 0.127305
200 0.130655
200 0.122171
200 0.094856
```

Run 3 started after about a minute of idle, with load average 1.66 (5.54 over the last 5 minutes):

```
$ curl -s -o /dev/null -w "%{http_code} %{time_total}\n" -H "Authorization: Token $TOKEN" "http://localhost:8080/api/label-counts?task_id=1"   # 1 warm-up, then 5 runs
warm-up: 200 0.092651
200 0.140579
200 0.148731
200 0.102943
200 0.111749
200 0.107286
## counts.py alone inside cvat_server, 5 calls (ms)
[25.1, 34.0, 27.1, 25.3, 24.5]
```

- **Result:** the medians were 127.3 ms (94.9-135.7) and 111.7 ms (102.9-148.7). Still missed, and no better than
  run 1.
- **What the index did:** it made `count_annotations_by_label` itself about twice as fast, 24-34 ms against
  41-57 ms in run 1. But the whole request did not get measurably faster, because about 85 ms of it is outside the
  count: token authentication, the OPA policy call, loading the task twice, nginx and Traefik. On this machine
  the run-to-run spread (about 50 ms) is larger than the 20 ms the index saves.
- **Decision:** I rolled the index back (`migrate test zero`, migration deleted, nothing committed). It would add
  a schema change and write-time cost to CVAT's core annotation table for a gain I could not show end to end.
- **What would be measured next:** the OPA call and the second task load, which make up most of the remaining
  time.

