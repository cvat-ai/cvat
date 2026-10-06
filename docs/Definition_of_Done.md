# Definition of Done: Annotation Analytics

All acceptance criteria are verified against concrete implementation artifacts and automated test evidence.

---

## Acceptance Checklist & Evidence

- [x] **1. Endpoint returns correct counts, checked against a known task.**
  * *Evidence*: Test `test_per_class_counts_aggregation` passed in [test_analytics.py](file:///d:/Annotation/cvat/cvat/apps/test/tests/test_analytics.py#L65). ORM SQL aggregation in [cvat/apps/test/views.py](file:///d:/Annotation/cvat/cvat/apps/test/views.py#L22) computed 180 total annotations across 3 classes (`car: 120`, `pedestrian: 45`, `bicycle: 15`).

- [x] **2. Page renders the graph, with the empty and error cases covered.**
  * *Evidence*: Implemented in [task-annotation-analytics.tsx](file:///d:/Annotation/cvat/cvat-ui/src/components/analytics-report/task-annotation-analytics.tsx#L100-L180). Empty state renders Ant Design `<Empty />` when `total_annotations === 0`. Error state renders `<Alert type="error" />` with a retry trigger when the API returns an error or connection drops.

- [x] **3. Endpoint enforces authentication and task-level access control.**
  * *Evidence*: Tests `test_unauthenticated_request_rejected` and `test_unauthorized_user_forbidden` in [test_analytics.py](file:///d:/Annotation/cvat/cvat/apps/test/tests/test_analytics.py#L44-L53). Requests with no credentials return HTTP 401; authenticated requests lacking task permissions return HTTP 403 via [check_task_access](file:///d:/Annotation/cvat/cvat/apps/test/permissions.py#L12).

- [x] **4. Custom filter or grouping implemented beyond plain count.**
  * *Evidence*: Shape type geometry filtering (`?shape_type=polygon`) verified in [views.py](file:///d:/Annotation/cvat/cvat/apps/test/views.py#L25) and tested in `test_shape_type_filtering` returning only matching geometry records.

- [x] **5. Objective measured, 5 runs, raw output saved.**
  * *Evidence*: Documented in [docs/Objectives.md](file:///d:/Annotation/cvat/docs/Objectives.md#L28). 5 runs executed on Intel i5-6300U: `[1.47, 1.35, 1.40, 1.36, 1.30] ms`.

- [x] **6. Target met, or missed with the reason written down.**
  * *Evidence*: Target was $\le 50.0$ ms. Result met with a median of **1.36 ms** and a spread of **0.17 ms**.

- [x] **7. Decision record documented.**
  * *Evidence*: Approach taken (direct database ORM SQL aggregation) vs approach rejected (in-memory deserialization) and associated trade-offs recorded in [docs/Plan.md](file:///d:/Annotation/cvat/docs/Plan.md#L35).

- [x] **8. Scope boundary and unfinished items explicitly declared.**
  * *Evidence*: Declared in Section Below (WebSockets live push skipped per 8-hour prioritization).

---

## Scope Boundary & Unfinished Items
* **Item 8 & 9 (Live WebSocket broadcast for real-time annotation sync)**:
  * *Status*: Intentionally skipped to adhere to the 8-hour time constraint and avoid introducing architectural complexity without a dedicated Redis channel layer running in the local environment.
  * *Alternative provided*: The UI component includes an on-demand "Refresh" control that allows annotators and managers to fetch the latest counts without reloading the page.
