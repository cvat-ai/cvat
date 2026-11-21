# Assessment Plan — Annotation Analytics

## Chosen Approach
Build the annotation analytics API in a new Django app named `test`, following CVAT's existing API, authentication and task-permission patterns. Read annotation counts from the database, expose them to the frontend, and display them in a graph. Add live WebSocket updates after the core feature is working.

## Rejected Approach
Build a separate analytics service with its own database.

## Cost of Rejection
Rejecting a separate service means analytics cannot be deployed or scaled independently and remains coupled to CVAT releases. This is acceptable because the feature directly depends on CVAT task and annotation data.

## Implementation Order

| Order | Work | Estimate |
|---|---|---:|
| 1 | Documentation and first Plan commit | 20 min |
| 2 | Start CVAT Docker stack and create admin account | 45 min |
| 3 | Import COCO 2017 validation data | 35 min |
| 4 | Implement database-backed per-class API | 75 min |
| 5 | Enforce login and task-level permissions; test both denial cases | 40 min |
| 6 | Build frontend page and graph | 65 min |
| 7 | Handle empty data and failed requests | 20 min |
| 8 | Add one useful grouping/filter and justify it | 25 min |
| 9 | Add WebSocket updates and reconnection | 65 min |
| 10 | Measure performance, run tests and complete evidence | 50 min |
| 11 | Final review, commits, PR and Loom recording | 40 min |
| | **Total** | **8 hours** |

Docker image downloads and dataset import waiting time will run independently where possible and are excluded from the assessment's working-time budget, as permitted by the brief.

## Deferred Work
Additional chart types, multiple filters, unrelated CVAT refactoring and features beyond the assessment requirements.

## Decision Record
The implementation will use CVAT's existing Django, database, authentication and permission infrastructure. A separate analytics service was rejected to keep the solution contained. The trade-off is tighter coupling to CVAT's internal models and deployment lifecycle, but it avoids operating and synchronizing another service.