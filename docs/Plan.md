# Plan: Annotation Analytics

Candidate: Afshan Farooq
Fork: `Afshan-Farooq-dev/cvat`
Branch: `dev-test01`
Base commit: `f3c7c5b3e6cf5f8d64e39aa73625899e55dd481e`
Acknowledged: 9:20 pm PKT, 7 October 2026
Deadline: 5:20 am PKT, 8 October 2026

## Approach

I will work through the assessment requirements in order. Items 1–4 are the first priority and I will not start the WebSocket work until those are working.

For the backend, I will create the required Django app named `test`. The annotation-count endpoint will read from CVAT's existing database models and return counts grouped by class for a task. I will reuse CVAT's existing authentication and task permissions rather than creating separate access rules. I will verify the result against PostgreSQL directly.

For the frontend, I will create a page in CVAT's web interface that requests the endpoint and displays the counts as a graph. The page will also handle an empty task and a failed request clearly. The frontend Docker environment does not bind-mount the host source, so frontend changes require rebuilding `cvat_ui`; this has made frontend iterations more expensive than initially expected.

For the extra grouping, I plan to group class counts by annotation shape type if the existing models support it cleanly. I chose this because shape type is directly related to the annotations being counted and does not require another data source.

For live updates, I will first inspect CVAT's existing real-time infrastructure. I will reuse it where practical; otherwise I will implement the smallest WebSocket path needed to notify the page that annotations changed. The page will then fetch fresh counts from the API. Connection recovery will reconnect and refresh the counts.

The database will remain the source of truth. I will not create a separate counts table or stored counter.

## Order and time

| Step | Work | Time |
| --- | --- | ---: |
| 1 | Commit this Plan, then commit Definition of Done and Objectives separately | 30 min |
| 2 | Confirm the `test` app loads and inspect the relevant CVAT request/model flow | 30 min |
| 3 | Item 1: database-backed annotation-count endpoint and SQL verification | 60 min |
| 4 | Items 2–3: CVAT UI page and graph | 80 min |
| 5 | Item 4: empty-data and failed-request states | 30 min |
| 6 | Item 5: verify no-login, no-task-access and valid-access requests | 35 min |
| 7 | Item 6: run the endpoint measurement 5 times and record raw results | 30 min |
| 8 | Item 7: implement and verify the selected grouping | 30 min |
| 9 | Item 8: live graph updates over WebSocket | 55 min |
| 10 | Item 9: connection-drop recovery | 30 min |
| 11 | Item 10: complete the decision record and final DoD/Objectives evidence | 25 min |
| 12 | Final verification, Loom and pull request | 45 min |
| | **Total** | **480 min** |

Docker images and the dataset import were started before implementation. Their unattended waiting time is not counted, as allowed by the assessment instructions.

## Scope and priorities

Items 1–4 are the floor and remain the priority. Items 1–3 are implemented and evidenced; Item 4 is implemented but still needs runtime evidence for its empty and failed-request states. I will complete and evidence Items 1–4 before progressing further. The remaining items are conditional on time and environment feasibility; I will document anything unfinished rather than claiming completion.

The initial annotation count covers shape annotations created by the supplied COCO import. I will keep the implementation contained and avoid new database tables or unrelated CVAT changes.

## Decision record (draft)

This is the current implementation decision, but the Item 10 decision record is not complete until the final assessment status is reviewed.

**Approach taken:** calculate the counts from CVAT's existing annotation data when the API is requested. This is the implementation used for Items 1–3.

**Approach rejected:** maintain a separate counts table or cached counter that must be updated whenever annotations change.

**Cost of rejecting it:** the database aggregation runs again for each request, so response time depends on task size. I will measure that cost under MO-1 if Item 6 is reached. For live updates, a possible WebSocket approach would signal that something changed and the page would request the current counts again.

## Changes to the plan

- Items 1–3 are complete and verified with the evidence referenced in `Definition-of-Done.md`.
- Item 4 is implemented, but frontend Docker rebuild/runtime verification is still in progress. It remains open until both no-data and failed-request behavior are evidenced.
- Item 5 permission behavior has been tested, but it remains open while the Items 1–4 floor is unfinished.
- The priority remains getting Items 1–4 fully working and evidenced before progressing to later items.

If the plan changes during implementation, I will record what changed and why here rather than rewriting the original plan.
