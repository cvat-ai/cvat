
@'
# Definition of Done

## Backend API
- [x] Endpoint returns annotation counts grouped by label from the database.
- [x] API response format verified using a task with annotations.
- [x] Unauthenticated requests are rejected with HTTP 401.
- [x] Empty annotation data returns a valid empty result.
- [ ] Users without access to the task are rejected; test with a user lacking permission.
- [ ] API error cases are tested and documented.

## Frontend
- [ ] Frontend page calls the annotation-count API.
- [ ] Counts are displayed in a graph.
- [ ] Loading, empty-data, and failed-request states are handled.
- [ ] At least one useful filter or grouping option is available.

## Performance and Live Updates
- [ ] Five real API response-time measurements are recorded.
- [ ] Median and minimum-maximum spread are recorded in `docs/Objectives.md`.
- [ ] Raw measurement output is included.
- [ ] WebSocket live updates are implemented if time permits.
- [ ] WebSocket reconnection is tested if implemented.

## Documentation and Delivery
- [x] `docs/Plan.md` was committed before feature implementation.
- [x] `docs/Objectives.md` contains machine details and the measurement plan.
- [x] `docs/Definition-of-Done.md` contains the completion checklist.
- [ ] Documentation is updated with final results and evidence.
- [ ] Remaining limitations and unfinished work are documented.
- [ ] Changes are committed incrementally on `dev-test01`.
- [ ] A pull request is created against the main branch of my own fork.
- [ ] A Loom demo of five minutes or less is recorded and checked.
- [ ] PR and Loom links are sent before the assessment deadline.

## Final Status

- **Overall result:** Pending
- **Evidence and explanation:** To be completed after testing.
- **Unfinished work:** Frontend, graph, permission tests, performance measurements, filter, and delivery steps remain.
'@ | Set-Content docs/Definition-of-Done.md
