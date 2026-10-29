# Objectives

## Performance objective

| ID | Field | Entry |
| --- | --- | --- |
| MO-1 | What is measured | Elapsed browser time for the authenticated task annotation-count API request, from request start until the response body is read. |
| MO-2 | How | Warm the route, time five sequential same-origin `fetch` requests with `performance.now()`, retain the raw milliseconds, and calculate the median and range. |
| MO-3 | Target | Median at or below 100 ms on this local development stack. This target is an explicit local API budget, not a general CVAT service-level guarantee. |
| MO-4 | Conditions | Chrome, local Docker stack, authenticated user, imported COCO validation sample, warmed endpoint, no other significant work. |
| MO-5 | Not included | Cold startup, task-page rendering time, and video tasks. |

## Machine and source

- Operating system: Windows 11 Pro.
- CPU: Intel Core i7-8650U @ 1.90 GHz.
- Installed RAM: 15.85 GiB.
- CVAT starting commit: `4a09e27ff869b7aebbfdb07b29c4a34904a0221d`.
- Sample dataset: 130 annotated COCO 2017 validation images across tasks #9,
  #10, and #11; the measured task (#9) contains 60 images and 1,589 shape
  annotations across eight labels.

## Measurement results

Warm API values (ms): `83.43, 82.01, 82.88, 82.09, 119.00`.
Median: `82.88 ms`. Spread (maximum minus minimum): `36.99 ms`.
The 100 ms median objective was met. Measurements were taken after warming
`/api/tasks/9/annotation_counts?group_by=label`; each value includes the
authenticated request and reading the response body.

Earlier browser request-to-chart timings were 350.37, 243.59, 478.57, 326.18,
and 346.70 ms (median 346.70 ms; range 234.98 ms). Those measure UI chart
insertion rather than the API response and are retained only as prior
diagnostic evidence, not as the endpoint objective result.
