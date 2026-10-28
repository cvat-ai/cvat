# Plan

This assessment is built around CVAT, a large existing codebase. The goal is to add a task-level annotation-class count API and a lightweight UI graph without spiking unrelated behavior. I will follow the required order: set up the repo and documentation, validate the backend data model, implement the count endpoint and auth checks, then wire the frontend page and error/empty states, measure the endpoint against a target, and record the outcome in the definition of done.

## Order of work
1. Confirm the annotation and task models, plus access control and API routing patterns.
2. Implement a backend endpoint returning per-class annotation counts for a task from the database.
3. Add frontend page logic to call the endpoint and render a graph, including empty and failed states.
4. Validate login restrictions and unauthorized task access.
5. Measure the endpoint with 5 runs and record the result.
6. Capture the decision record, remaining gaps, and final evidence.

## Timebox
- Model/API discovery and auth check: 1 hour
- Backend endpoint and validation: 2 hours
- Page and graph wiring: 2 hours
- Empty/error states and live updates: 1 hour
- Measurements and documentation: 1 hour
- Reserve: 1 hour for integration/debugging and documentation polishing

## Explicitly skipped / deferred
- Full WebSocket reconnect architecture beyond the page-level retry handling, unless the existing event plumbing already supports a minimal live refresh path.
- Broad optimization work across the entire CVAT codebase.
- Anything outside the task-level count feature and its display.
