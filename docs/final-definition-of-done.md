# Definition of Done

- [x] Task-level API returns annotation counts by class from database aggregation.
- [x] The endpoint returns 401 without login and 403 without task access.
- [x] Browser graph rendering, empty state, and request error state are verified.
- [x] Five warm browser timings are captured; their median meets the 350 ms target.
- [ ] Loom demonstration is pending; no recording was captured.
- [x] Remaining work is explicitly listed below.

## Validation evidence

- Local UI and `/api/server/about` returned HTTP 200.
- Unauthenticated `/api/tasks/1/annotation_counts` returned HTTP 401.
- Authenticated API test returned `person: 1` and `empty-label: 0`.
- A user without access to the task received HTTP 403.
- `TaskAnnotationCountsAPITestCase` passed all 3 tests for count aggregation,
  unauthenticated access, and denied task access.
- `TaskGetAPITestCase` passed all 4 existing tests.
- Browser check on an annotated task rendered the bar chart for `person: 1`.
- Browser check on an empty task displayed the friendly no-annotations state.
- Intercepting the count request with HTTP 500 displayed the error alert and
  `Request failed with status 500`.
- A browser-observed React hooks-order error found during verification was
  fixed; the rebuilt UI rendered the chart successfully afterward.
- UI production webpack build completed with 2 asset-size warnings.
- Focused UI lint, TypeScript type-check, Python syntax check, and
  `git diff --check` passed.
- Warm browser timings from annotation-count request start to chart canvas
  insertion (ms): 350.37, 243.59, 478.57, 326.18, 346.70.
- Median browser request-to-chart time: 346.70 ms (target: <= 350 ms).
- Separate Django API-client timings (ms): 26.11, 28.79, 37.13, 31.82, 50.18;
  median: 31.82 ms.

## Remaining work

- Record and share the requested Loom demonstration. A Loom account/session and
  permission to publish a recording were not available during this task.
