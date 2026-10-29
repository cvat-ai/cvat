# Definition of Done

Written before any code, on 2026-10-29 at the start of the assessment.

**How I decide the work is finished:**
- Every line in "Floor" is ticked, with evidence.
- Every other line is either ticked with evidence or moved to "Not done" with the reason.
- A line counts as ticked only when a number, raw output, commit or screenshot link is written beside it.

Lines are never deleted or reworded. Ticking a line means changing `[ ]` to `[x]` and filling in its
evidence.

## Setup

- [ ] Stack runs from the locally built server image, CVAT commit `b36a49bd5`. Evidence:
- [ ] COCO task created and annotations imported; image, annotation and job counts written in `objectives.md`.
      Evidence:

## Floor (items 1-4)

- [ ] 1. The endpoint returns per-label counts read from the database for a task. Evidence:
- [ ] 1. The counts match the COCO file exactly (MO-2: 0 differing labels). Evidence:
- [ ] 2. The page opens from the task Actions menu, and directly at `/tasks/<id>/label-counts`. Evidence:
- [ ] 3. The page draws a bar chart of the counts. Evidence:
- [ ] 4. A task with no annotations shows an empty state, not a blank or broken chart. Evidence:
- [ ] 4. A failed request (server stopped) shows an error with a retry, the page does not crash, and retry works
      once the server is back. Evidence:

## Next tier (items 5-7)

- [ ] 5. A request with no login is refused with 401. Evidence:
- [ ] 5. A logged-in user without access to the task is refused with 403. Evidence:
- [ ] 5. The page shows the refusal as an error, not as an empty chart. Evidence:
- [ ] 6. MO-1 measured: 5 runs, raw output in `objectives.md`, median and spread. Evidence:
- [ ] 6. MO-1 target met, or missed with the reason written down. Evidence:
- [ ] 7. The job filter returns counts for one job only, and the per-job totals add up to the task total.
      Evidence:
- [ ] 7. A job that belongs to another task is rejected with 400. Evidence:
- [ ] 7. The reason for choosing this filter is written down. Evidence:

## Stretch (items 8-10)

- [ ] 8. Adding or deleting a box in a job updates the graph without a reload. Evidence:
- [ ] 8. MO-3 measured, or skipped with the reason. Evidence:
- [ ] 9. After the server is stopped and started again, the page shows that it is reconnecting, then recovers and
      refetches. Evidence:
- [ ] 10. Decision record written in `plan.md`. Evidence:

## Presentation

- [ ] The plan was the first commit, and that commit holds no code. Evidence:
- [ ] Commits are small and each one says what changed and why. Evidence:
- [ ] Lint and type checks pass for the changed code. Evidence:
- [ ] Backend tests for the counting rule and for refusal pass. Evidence:
- [ ] `cvat/schema.yml` is regenerated for the new endpoint. Evidence:
- [ ] The change is contained: no dead code, no commented-out blocks, no stray files. Evidence:
- [ ] The PR goes from `dev-test01` into my own fork, not the CVAT repository. Evidence:

## Not done (added at the end)

Each entry gives the item, why it was not reached, and what state it was left in.
