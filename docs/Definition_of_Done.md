# Definition of Done

- [x] **Endpoint returns correct counts from database**
  - *Evidence:* Python benchmark confirmed correct aggregation across tables (LabeledShape, LabeledTrack, etc.) via `TestTaskViewSet` on endpoint `GET /api/test/tasks/{id}/annotations/stats`.

- [ ] **Frontend renders counts as a graph**
  - *Evidence:*

- [ ] **Resilience: Empty data state handled cleanly**
  - *Evidence:*

- [ ] **Resilience: Failed request state handled cleanly**
  - *Evidence:*

- [x] **Auth: Refuses unauthenticated requests**
  - *Evidence:* `cvat/apps/test/tests.py::test_unauthenticated_request` passing with HTTP 401.

- [x] **Auth: Refuses user with no access to task**
  - *Evidence:* `cvat/apps/test/tests.py::test_unauthorized_request` passing with HTTP 403. Uses CVAT `TaskPermission` IAM class.

- [x] **Performance: Objective measured (5 runs)**
  - *Evidence:* Recorded in `docs/Objectives.md`. Median: 12.02 ms.

- [x] **Performance: Target evaluation documented**
  - *Evidence:* Target of 200ms comfortably met (Median 12.02 ms).

- [ ] **Scope: Incomplete items transparently documented**
  - *Evidence:*

- [ ] **Architecture: Decision record completed**
  - *Evidence:*
