# Definition of Done

| Requirement | Status | Evidence / remaining work |
| --- | --- | --- |
| Task API returns database counts by label. | Done | `/api/tasks/{id}/annotation_counts`; backend test checks count and a zero-count label. |
| Backend aggregation is in the new Django app named `test`. | Done | `cvat/apps/test/annotation_counts.py`; task-scoped route retains CVAT task permission checks. |
| Page calls API and displays a graph. | Done | Task detail page, browser-verified on Task #7. |
| Empty and failed-request states work. | Done | Empty task showed friendly message; intercepted HTTP 500 showed an error alert. |
| Existing login and per-task access are enforced. | Done | API tests verify 401 unauthenticated and 403 without access. |
| One additional grouping/filter is present. | Done | Added `group_by=type` and a UI selector for labels versus image/shape/track/interval; focused backend tests verify the type-grouped response and reject invalid group names. |
| Performance objective is measured on the required sample. | Done | Five warm API requests on COCO Task #9: median 82.88 ms, spread 36.99 ms; the 100 ms target is met. |
| Graph updates over WebSocket and recovers after reconnect. | Not done | Current CVAT stack has no WebSocket event server/client integration; this needs a supported socket service and reconnect tests. |
| Plan contains approach, rejected approach, and cost. | Done | Decision record in `brief-plan.md`; socket-service work and its integration cost are declared. |
| Required public COCO 2017 validation data is loaded. | Done | 130 annotated validation images across Tasks #9-#11; official image and annotation archives passed ZIP CRC checks. |
| Required Loom (5 minutes or less) is recorded and shared. | Pending user action | Record the live feature, one page-to-database request trace, and answer K1-K4. |
| Public fork and PR into that fork are submitted. | Pending user action | Current `origin` points to the upstream CVAT repository. A fork URL/account authorization is needed; do not open a PR against upstream. |

## Verified evidence to date

- CVAT UI and `/api/server/about` returned HTTP 200.
- Endpoint returned `person: 1` and `empty-label: 0` on the initial test task.
- Unauthenticated endpoint request returned HTTP 401; user without task access
  received HTTP 403.
- Five focused endpoint tests passed after moving the API mixin and adding
  grouping: label totals, type grouping, invalid grouping, unauthenticated
  access, and denied task access.
- Nine endpoint and existing task API regression tests passed after the
  aggregation was consolidated into one SQL `UNION ALL` query for labels;
  Django system checks passed.
- COCO sample: Task #9 contains 60 images and 1,589 shape annotations across
  eight labels. Tasks #10 and #11 contain 40 and 30 images respectively.
- Warm authenticated API timings on Task #9 (ms):
  `83.43, 82.01, 82.88, 82.09, 119.00`. Median: `82.88 ms`;
  spread: `36.99 ms`; 100 ms objective met. Type grouping also returned 1,589
  Shape annotations and zero Image, Track, and Interval records.
- Browser rendered the chart, friendly empty state, and HTTP 500 error alert.
- Five prior browser request-to-canvas timings (ms):
  `350.37, 243.59, 478.57, 326.18, 346.70`.
  Median: `346.70 ms`; range: `234.98 ms`. This is UI timing, not endpoint timing.
- Machine: Windows 11 Pro, Intel Core i7-8650U @ 1.90 GHz, 15.85 GiB RAM.
- CVAT base commit: `4a09e27ff869b7aebbfdb07b29c4a34904a0221d`.
- Work is on local `dev-test01`; current configured origin is
  `https://github.com/cvat-ai/cvat.git`, so it is not yet a public personal fork.
