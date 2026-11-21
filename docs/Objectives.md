
# Objectives

## Project objective

Build an annotation analytics feature in CVAT that returns the number of annotation records per class for a task, displays the results as a graph, handles empty and failed requests, and respects existing CVAT authentication and task-level permissions.

## Measurable objectives

1. Provide an API endpoint that returns annotation counts grouped by class for a task.
2. Reject unauthenticated requests and requests from users who do not have access to the requested task.
3. Display the returned class counts in a frontend graph.
4. Show clear UI states when no annotation data exists or the API request fails.
5. Add at least one meaningful filter or grouping option beyond plain counts.
6. Support live graph updates through WebSocket and recover after a dropped connection, subject to completion within the assessment time.

## Performance objective

- Metric: API response time for the annotation analytics endpoint.
- Target: 500 ms or less per request.
- Measurement method: Five requests against the imported COCO 2017 validation dataset.
- Number of requests: 5.
- Raw measurements:
  - Request 1: 32.908 ms
  - Request 2: 24.730 ms
  - Request 3: 16.902 ms
  - Request 4: 17.052 ms
  - Request 5: 13.987 ms
- Median response time: 17.052 ms.
- Minimum response time: 13.987 ms.
- Maximum response time: 32.908 ms.
- Spread (maximum - minimum): 18.921 ms.
- Result: All five measured requests were within the 500 ms target.
- Evidence: `docs/performance-raw.txt`.

## Test environment

| Item | Value |
|---|---|
| Operating system | Microsoft Windows 11 Pro |
| OS version | 10.0.26300 |
| OS build | 26300 |
| CPU | 11th Gen Intel Core i7-1185G7 @ 3.00 GHz |
| Logical processors | 8 |
| RAM | 15.69 GB |
| CVAT base commit | f2a676c792c99a62182d01243ef1359f4814104b |
| Dataset | COCO 2017 validation |
| Imported image count | 5,000 |
| Imported label classes | 80 |

## Annotation count definition

Counts represent top-level annotation records grouped by label name. The implementation accounts for the relevant annotation types: labeled shapes, labeled images, labeled tracks, and labeled intervals. Individual tracked shapes are not counted separately from their parent track records.

## Evidence

- API response test: successful authenticated request.
- Authentication test: unauthenticated request returned HTTP 401.
- Task permission test: user without task access received HTTP 403.
- Frontend graph showing the top 15 annotation classes.
- All Classes / Top 15 filter implementation.
- Empty-data state screenshot.
- Failed-request state screenshot.
- Five raw performance measurements, median, and spread in `docs/performance-raw.txt`.
- WebSocket update and reconnection demonstration, pending.
- Loom walkthrough and pull request link, pending.