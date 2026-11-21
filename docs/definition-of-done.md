# Definition of Done: Annotation Analytics

Boxes stay unticked until I have evidence for them. No evidence, no tick.

Reference: CVAT commit d4d08dedb5ad7c5e980c0bc7319a7f5587365dad,
branch dev-test01, objective MO-1 in docs/objectives.md.

## Floor (items 1-4)

- [ ] 1. Endpoint returns the number of annotations per class for a task,
      read from the database.
      Evidence:
- [ ] 1a. Counts checked against a known task (compared with what CVAT shows).
      Evidence:
- [ ] 2. A page in the web interface calls the endpoint.
      Evidence:
- [ ] 3. Counts are shown as a graph.
      Evidence:
- [ ] 4a. Empty state (task with no annotations) handled cleanly.
      Evidence:
- [ ] 4b. Failed request handled cleanly.
      Evidence:

## Access control (item 5)

Status codes below are what I expect; the evidence must show what CVAT's
existing permission behaviour actually returned.

- [ ] 5a. Request with no login is refused (expected 401 Unauthorized).
      Evidence: command and actual status code:
- [ ] 5b. User without access to the task is refused (expected 403 Forbidden).
      Evidence: command and actual status code:
- [ ] 5c. User with access to the task is served (expected 200 OK).
      Evidence: command and actual status code:

## Performance (item 6)

- [ ] 6a. MO-1 measured: 5 runs after one warm-up, raw output saved in
      docs/evidence/mo1-runs.txt.
      Evidence:
- [ ] 6b. Median, minimum and maximum reported.
      Evidence:
- [ ] 6c. Target (median at or below 500 ms) met, or missed with the
      reason written down in docs/OBJECTIVES.md.
      Evidence:

## Filter or grouping (item 7)

- [ ] 7a. One filter or grouping added beyond the plain count.
      Evidence:
- [ ] 7b. Reason for choosing it written down.
      Evidence:

## Live updates (items 8-9, only if time remains)

- [ ] 8. Graph updates live over WebSocket.
      Evidence:
- [ ] 9. Page recovers when the connection drops and comes back.
      Evidence:

## Documents and honesty

- [ ] 10. Decision record written at the end of docs/PLAN.md (approach
      taken, approach rejected, what rejecting it cost).
      Evidence:
- [ ] Plan changes during the work are noted with the reason.
      Evidence:
- [x] Actual image count recorded in Plan and Objectives: 500 images in
      task #4 (`coco-val-500`).
      Evidence: `engine_data.size=500`; task image count confirmed in CVAT.
- [ ] Everything I did not finish is listed below, with why.
      Evidence:

## Submission

- [ ] Public fork contains branch dev-test01.
      Evidence:
- [ ] One PR opened from dev-test01 into my fork's main branch.
      Evidence:
- [ ] Loom recording is no longer than 5 minutes and answers K1-K4 without notes.
      Evidence:
- [ ] PR and Loom links sent in reply to the assessment message within 8 hours.
      Evidence:

## Not finished

(To be filled at the end. Write "nothing" only if that is true.)