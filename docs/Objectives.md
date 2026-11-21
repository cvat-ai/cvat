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
- Measurement method: Run five requests against the imported dataset.
- Report: All five raw measurements, median response time, and spread (minimum to maximum).
- Evidence: Save raw command output in `docs/performance-raw.txt`.
- Status: Not measured yet. Do not report the target as achieved until measurements are collected.

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
| Dataset | COCO 2017 validation (import pending) |
| Imported image count | To be recorded after import |

## Annotation count definition

Counts represent top-level annotation records grouped by label name. The implementation must account for the relevant annotation types and must not count individual tracked shapes separately from their parent track records.

## Evidence

- API response and permission tests.
- Frontend graph and empty/error state screenshots.
- Filter or grouping demonstration.
- Five raw performance measurements, median, and spread.
- WebSocket update and reconnection demonstration, if completed.
- Loom walkthrough and pull request link.
