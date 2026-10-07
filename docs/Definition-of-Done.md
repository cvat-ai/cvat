# Definition of Done

Written before implementation started.

Base commit: `f3c7c5b3e6cf5f8d64e39aa73625899e55dd481e`
Data: COCO 2017 validation set, 5000 images, task `coco-5000`.

A line is marked complete only when evidence is recorded beside it.

## Feature checklist

| # | Done when | Evidence | Done |
|---|---|---|---|
| 1 | The endpoint returns annotation counts per class for a task from the database, and the result matches a direct database check. | `docs/evidence/item1-api-counts.json` + `docs/evidence/item1-db-counts.txt` | [x] |
| 2 | A page in the CVAT web interface calls the endpoint successfully. | `docs/evidence/item3-ui-build-success.png` | [x] |
| 3 | Per-class counts are displayed as a graph. | `docs/evidence/item3-graph.png` | [x] |
| 4 | The page clearly handles both an empty result and a failed request. | Screenshots of both cases | [ ] |
| 5 | A request without login is refused, a logged-in user without task access is refused, and a user with access succeeds. | `docs/evidence/item5-unauthenticated.txt`, `docs/evidence/item5-authenticated-no-task-access.txt`, `docs/evidence/item5-authenticated-task-access.txt` | [ ] |
| 6 | MO-1 is measured 5 times under the documented conditions and compared with the target. | `docs/evidence/mo-1-raw.txt` + Objectives result | [ ] |
| 7 | One useful grouping beyond the basic class count works and its reason is documented. | Screenshot + explanation | [ ] |
| 8 | The graph updates over WebSocket after annotations change. | Recording or logs showing the update | [ ] |
| 9 | The page recovers after the connection is interrupted and updates continue after reconnection. | Recording or logs showing drop and recovery | [ ] |
| 10 | The Plan contains the completed decision record: chosen approach, rejected approach and its cost. | Plan decision-record section | [ ] |

## Correctness

- [ ] Counts for `coco-5000` match between the endpoint and a direct PostgreSQL query. Evidence: endpoint and SQL outputs.
- [ ] The original COCO data is used as an additional sanity check against the database. Any difference found is measured and investigated. Evidence: comparison command/script and output.

## Process

- [ ] The Plan is the first assessment commit and contains no implementation code. Evidence: `git log --stat`.
- [ ] Commits show meaningful progress and describe what changed and why. Evidence: `git log --oneline`.
- [ ] No dead code, commented-out implementation blocks or stray files remain. Evidence: final diff and clean `git status`.
- [ ] The pull request is from `dev-test01` into `main` of my own fork. Evidence: PR link.
- [ ] The Loom is no longer than 5 minutes, demonstrates the feature and answers K1–K4 against the submitted code. Evidence: Loom link.
- [ ] Anything not completed is listed below with the reason.

## Not finished

- Item 4 is implemented in source code, but runtime evidence for both the empty-data and failed-request states is still pending.
- Item 5 has request/response evidence, but remains open until the Items 1–4 assessment floor is complete.
- Items 6–10 remain incomplete.
