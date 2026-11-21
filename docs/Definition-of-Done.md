# Definition of Done

## Documentation
- [ ] Plan.md contains the implementation sequence, estimates, skipped work, and decision record.
- [ ] Objectives.md contains measurable objectives and the actual test environment.
- [ ] Definition-of-Done.md records completion evidence and unfinished work.

## Backend API
- [ ] New Django app named `test` is implemented.
- [ ] API returns annotation counts grouped by class for a task.
- [ ] Counts are read from the database and cover the relevant top-level annotation types.
- [ ] Unauthenticated requests are rejected.
- [ ] Users without access to the task are rejected.
- [ ] API tests cover successful responses and permission failures.

## Frontend
- [ ] Frontend requests annotation analytics from the API.
- [ ] Results are displayed in a graph.
- [ ] Empty-data state is handled.
- [ ] Failed-request state is handled.
- [ ] At least one filter or grouping option beyond plain counts is implemented.

## Performance
- [ ] Five API response-time measurements are recorded.
- [ ] Raw measurements are saved in `docs/performance-raw.txt`.
- [ ] Median and minimum-to-maximum spread are reported.
- [ ] Results are compared with the 500 ms target.

## Live updates
- [ ] WebSocket updates refresh the graph.
- [ ] Dropped connections trigger reconnection.
- [ ] The graph recovers after reconnection.

## Dataset and environment
- [ ] CVAT starts successfully using Docker Compose.
- [ ] COCO 2017 validation dataset is imported.
- [ ] A task job opens with labelled bounding boxes.
- [ ] Actual imported image count is recorded.

## Submission
- [ ] Changes are committed in small, meaningful commits.
- [ ] Documentation and implementation are committed to `dev-test01`.
- [ ] A pull request is opened from `dev-test01` into `main` of the user's own fork.
- [ ] A Loom recording of no more than five minutes is prepared.
- [ ] PR and Loom links are sent as a reply to the assessment email.

## Evidence and unfinished work

Record actual test results, screenshots, command output, commit references, and links here. Mark unfinished items honestly; do not claim completion without evidence.
