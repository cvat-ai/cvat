
# Definition of Done

## Documentation
- [x] Plan.md contains the implementation sequence, estimates, skipped work, and decision record. Evidence: `docs/Plan.md`.
- [x] Objectives.md contains measurable objectives and the actual test environment. Evidence: `docs/Objectives.md`.
- [ ] Definition-of-Done.md records completion evidence and unfinished work. Evidence: this document; final review pending.

## Backend API
- [x] New Django app named `test` is implemented.
- [x] API returns annotation counts grouped by class for a task. Evidence: `GET /api/tasks/1/annotation-analytics` returned HTTP 200.
- [x] Counts are read from the database and cover the relevant top-level annotation types.
- [x] Unauthenticated requests are rejected. Evidence: HTTP 401.
- [x] Users without access to the task are rejected. Evidence: test user received HTTP 403.
- [ ] Automated API tests cover successful responses and permission failures.

## Frontend
- [x] Frontend requests annotation analytics from the API.
- [x] Results are displayed in a graph. Evidence: Task 1 graph screenshot.
- [x] Empty-data state is handled. Evidence: Task 2 displayed "No annotations available for this task."
- [x] Failed-request state is handled. Evidence: blocked API request displayed an error message.
- [x] At least one filter or grouping option beyond plain counts is implemented. Evidence: Top 15 / All Classes buttons.

## Performance
- [x] Five API response-time measurements are recorded.
- [x] Raw measurements are saved in `docs/performance-raw.txt`.
- [x] Median and minimum-to-maximum spread are reported.
- [x] Results are compared with the 500 ms target.
- Evidence: five requests; median 17.052 ms; minimum 13.987 ms; maximum 32.908 ms; spread 18.921 ms. All five were within the target.

## Live updates
- [ ] WebSocket updates refresh the graph.
- [ ] Dropped connections trigger reconnection.
- [ ] The graph recovers after reconnection.

## Dataset and environment
- [x] CVAT starts successfully using Docker Compose.
- [x] COCO 2017 validation dataset is imported.
- [x] A task job opens with labelled bounding boxes.
- [x] Actual imported image count is recorded: 5,000 images.

## Submission
- [ ] Changes are committed in small, meaningful commits.
- [ ] Documentation and implementation are committed to `dev-test01`.
- [ ] A pull request is opened from `dev-test01` into `main` of the user's own fork.
- [ ] A Loom recording of no more than five minutes is prepared.
- [ ] PR and Loom links are sent as a reply to the assessment email.

## Evidence and unfinished work

### Completed evidence
- Backend endpoint: `GET /api/tasks/1/annotation-analytics`
- Authenticated API response: HTTP 200.
- Unauthenticated API response: HTTP 401.
- User without task access: HTTP 403.
- Frontend graph: 80 annotation classes returned; Top 15 / All Classes filter implemented.
- Empty-data test: Task 2 showed the empty-state message.
- Failed-request test: blocked request showed the error state.
- Performance: five raw measurements saved in `docs/performance-raw.txt`.
- Dataset: 5,000 COCO 2017 validation images and 80 label classes imported.

### Unfinished work
- WebSocket live graph updates.
- WebSocket reconnection and recovery.
- Automated API tests.
- Final Git review and remaining commits.
- Loom recording and submission links.