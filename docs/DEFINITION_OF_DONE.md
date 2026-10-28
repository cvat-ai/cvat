# Definition of Done

Written before code. Each line gets ticked only with evidence (a number, a command output or a link) beside it.

## Floor (items 1–4)

- [ ] Endpoint returns per-class counts that match an independent count of the COCO file for the same images.
- [ ] Ground-truth / replica jobs and skeleton child points are not double counted (reasoned in code + checked).
- [ ] Task page Actions menu links to the stats page.
- [ ] Page shows a bar chart of counts per class.
- [ ] Task with zero annotations shows an empty state, not an empty chart.
- [ ] Failed request (e.g. server stopped) shows an error with a retry button, not a blank page or crash.

## Access (item 5)

- [ ] No login → 401 (curl output saved).
- [ ] Logged-in user without access to the task → 403 (curl output saved).
- [ ] User with access → 200.

## Objective (item 6)

- [ ] MO-1 measured: 5 runs, raw output in `docs/OBJECTIVES.md`.
- [ ] Target met, or missed with the reason written down.

## Beyond the floor (items 7–10)

- [ ] Grouping by shape type works and the reason for choosing it is written.
- [ ] Drawing/deleting a box in a job updates the open stats page without reload.
- [ ] Killing the connection (server restart) → page shows "reconnecting", then recovers and refreshes counts.
- [ ] Decision record in `docs/PLAN.md`.

## Hygiene

- [ ] No dead code, commented-out blocks or stray files in the diff (`git diff --stat main...dev-test01` reviewed).
- [ ] Commits are small and each message says what and why.
- [ ] Everything not finished is listed below.

## Not finished

(Filled in at the end.)
