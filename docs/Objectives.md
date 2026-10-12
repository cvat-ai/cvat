# Objectives

The target below was set before any measurement was taken.

## MO-1

| Field | Entry |
| --- | --- |
| What is measured | Time for the server to answer one request for a task's counts per class, from sending the request to receiving the full answer. |
| How | `curl` on the same machine as the server, logged in as a user who can see the task, printing the total time. Run 5 times in a row. The script `validation-scripts/measure_speed.sh` logs in once and reuses the login token for every run, as the web page does. |
| Target | Median of 5 runs at or below **150 ms**. |
| Conditions | Local Docker stack, the COCO 2017 validation sample, the task named under "Sample data" below, nothing else running. Laptop plugged in, not in power-saving mode. Measured as the admin user who owns the task. |
| Not included | The first request after the server starts, the time the browser takes to draw the chart, and any network delay between two machines. |

## Why 150 ms

The page shows nothing useful until this answer arrives, so the answer has to feel immediate.
People stop noticing a wait somewhere below about 200 ms. 150 ms leaves the browser some time
to draw the chart inside that.

I do not expect this to be free. Each request does three things before it can answer: check the
login, ask CVAT's permission service whether this user may see the task, and count the rows.
Only the last one is my code, so I can miss this target for reasons I do not control. If I do,
I will say which of the three parts took the time.


## Machine

| | |
| --- | --- |
| CPU | 12th Gen Intel Core i7-12650H, 10 cores, 16 threads |
| RAM | 16 GB |
| Operating system | Pop!_OS 24.04 LTS, Linux kernel 7.0.11 |
| CVAT commit | `454d60c31a59cb411d82660a3644e29d8fef7bb0` |

## Sample data

| | |
| --- | --- |
| Task | #2, "TEST COCO" |
| Images | 5,000 (COCO 2017 validation set) |
| Annotations | 41,866 shapes in 80 classes |
| Jobs | 1 |

## Result

I may have understated when I set the target to be under 150ms because the results were achieved easily:

```txt
GET http://localhost:8080/api/tasks/2/class-counts
run 1: HTTP 200  58.3 ms
run 2: HTTP 200  58.7 ms
run 3: HTTP 200  53.6 ms
run 4: HTTP 200  55.5 ms
run 5: HTTP 200  57.5 ms
median: 57.5 ms
spread: 53.6 to 58.7 ms (range 5.1 ms)
```

### After the grouping was added

The endpoint changed after the measurement above. It now also lists the task's jobs and counts
the images per class, which makes the database query slower. The result above is for the
endpoint before that change.

I did not measure again, because I ran out of time. So the result above does not describe the
endpoint as submitted, and I cannot say whether the target is still met.
