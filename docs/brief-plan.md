# Plan

## Goal and order

Add a task-level annotation-count API and chart to CVAT, then prove correct
counts, access control, and performance without changing unrelated behavior.

1. Record the starting CVAT commit and map task, label, and annotation models.
2. Implement the count aggregation in the assessment Django app named `test`;
   use CVAT's task API permission checks for task access.
3. Add a task-page chart with a label/type grouping selector, plus empty and
   request-error states.
4. Test returned counts, login and task access, grouping, and browser behavior.
5. Measure five warm API requests, report raw values, median, spread, machine,
   operating system, and starting CVAT commit.
6. Update this plan and the Definition of Done with the actual outcome and gaps.

## Timebox

- Repository/model investigation and first committed docs: 1 hour.
- API, permissions, and backend tests: 2 hours.
- UI, chart, and grouping selector: 2 hours.
- Browser verification and performance measurements: 1 hour.
- Documentation and recording preparation: 1 hour.
- Integration and debugging reserve: 1 hour.

## Decisions and changes from plan

- Keep the task-specific API action on CVAT's `TaskViewSet`, rather than
  creating a parallel route, so the existing task object permission check
  protects the endpoint. Put the database aggregation in the new
  `cvat.apps.test` Django app as requested.
- Add grouping by annotation record type (image, shape, track, or interval) in
  addition to the required per-label totals. This is useful for distinguishing
  annotation storage types while keeping the default view simple.
- Combine the four per-model label aggregates with SQL `UNION ALL` so one
  database round trip serves all annotation types. The five-request median on
  the COCO sample then met the 100 ms objective.
- Route WebSocket connections through CVAT's existing ASGI/Uvicorn and Nginx
  stack. Validate the same-origin request, logged-in session, and existing
  task-view permission before subscribing to a per-task Redis Pub/Sub channel.
- Publish annotation-change invalidations from the dataset manager after
  successful transaction commits, including task/job edits and annotation
  imports. The UI refreshes counts on connect, on each invalidation, and after
  reconnect; reconnect attempts use capped exponential backoff.
- The assessment's COCO 2017 data is being prepared separately from the small
  synthetic browser-validation task, to avoid hiding which dataset each result
  came from. The imported sample consists of 130 annotated validation images
  across three tasks; performance was measured on the 60-image task.
- Use the already-running Redis instance for Pub/Sub rather than adding a
  separate Channels service, dependency, or container. WebSocket connections
  carry no annotation data; their authorized task channel only sends an
  invalidation message, and the task-count API remains the source of truth.
