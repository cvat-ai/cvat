# Definition of Done

- [x] Task-level API returns annotation counts by class from database aggregation.
- [x] The endpoint returns 401 without login and 403 without task access.
- [ ] Browser verification of the graph and empty state is pending.
- [ ] Browser verification of the request error state is pending.
- [x] Five warm endpoint timings and their median are recorded below.
- [ ] Loom demonstration is pending; no recording was captured.
- [x] Remaining work and measurement limitations are listed below.

## Validation evidence

- Local UI and `/api/server/about` both returned HTTP 200.
- Unauthenticated `/api/tasks/1/annotation_counts` returned HTTP 401.
- An authenticated request returned `person: 1` and `empty-label: 0`.
- A non-owner request to the same task endpoint returned HTTP 403.
- `TaskGetAPITestCase` passed all 4 tests.
- UI production webpack build completed with 2 existing asset-size warnings.
- Focused UI lint, TypeScript type-check, Python syntax check, and `git diff --check` passed.
- Warm authenticated endpoint timings (ms): 26.11, 28.79, 37.13, 31.82, 50.18.
- Median endpoint time: 31.82 ms.

## Remaining work

- The recorded timings use Django's in-process API test client; they do not
  replace the browser task-page measurement defined in `requirements-objectives.md`.
- Verify chart rendering, empty state, and request error state in a connected browser.
- Record five browser task-page timings with a warm cache and the sample dataset.
- Capture the requested Loom demonstration.
