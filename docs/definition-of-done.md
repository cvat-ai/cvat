# Definition of Done

Written before any code, on 2026-10-29 at the start of the assessment.

**How I decide the work is finished:**
- Every line in "Floor" is ticked, with evidence.
- Every other line is either ticked with evidence or moved to "Not done" with the reason.
- A line counts as ticked only when a number, raw output, commit or screenshot link is written beside it.

Lines are never deleted or reworded. Ticking a line means changing `[ ]` to `[x]` and filling in its
evidence.

## Setup

- [x] Stack runs from the locally built server image, CVAT commit `b36a49bd5`. Evidence: image
      `cvat/server:dev` created 2026-10-29 10:38:49 UTC; `GET /api/server/about` returns `"version":"2.81.1"`,
      the version in this commit's `cvat/__init__.py`.
- [x] COCO task created and annotations imported; image, annotation and job counts written in `objectives.md`.
      Evidence: 17:14, task 1: 5000 images, 10 jobs, 80 labels, 36,781 COCO
      instances stored as 41,866 shapes (data log in `objectives.md`).

## Floor (items 1-4)

- [x] 1. The endpoint returns per-label counts read from the database for a task. Evidence: `GET /api/label-counts?task_id=1` as the owner returns 200, total
      41,866 over 80 labels (person 12,451, car 2,315, chair 2,141); `test_owner_gets_counts` passes.
- [x] 1. The counts match the COCO file exactly (MO-2: 0 differing labels). Evidence: MO-2 run 1 in `objectives.md`: 0 of 80 labels differ from the COCO
      file counted as CVAT stores it, and a direct SQL count agrees; see the note there on multi-part polygons.
- [ ] 2. The page opens from the task Actions menu, and directly at `/tasks/<id>/label-counts`. Evidence:
- [x] 3. The page draws a bar chart of the counts. Evidence: 2026-10-29 17:33, `/tasks/1/label-counts` in Chrome shows 80 bars in label
      colours, sorted, scrolling inside the card (screenshot in the PR description).
- [x] 4. A task with no annotations shows an empty state, not a blank or broken chart. Evidence: 17:52, task 2 (one image, no annotations) shows "No annotations in
      this task yet" and no chart (screenshot in the PR description).
- [x] 4. A failed request (server stopped) shows an error with a retry, the page does not crash, and retry works
      once the server is back. Evidence: 17:49, page loaded, `docker stop cvat_server`, Retry: error state
      "Could not load label counts / Bad Gateway" with Retry; `docker start`, Retry: chart back.

## Next tier (items 5-7)

- [x] 5. A request with no login is refused with 401. Evidence: `curl localhost:8080/api/label-counts?task_id=1` returns 401
      "Authentication credentials were not provided."; `test_anonymous_user_gets_401` passes.
- [x] 5. A logged-in user without access to the task is refused with 403. Evidence: user `noaccess` (not owner, assignee or org member)
      gets 403 on task 1, the same as CVAT's own `/api/tasks/1`; `test_user_without_access_to_the_task_gets_403`
      passes against the real OPA policy.
- [x] 5. The page shows the refusal as an error, not as an empty chart. Evidence: 17:34, as `noaccess` the page shows "Could not load label counts"
      with "You do not have permission to perform this action." and Retry (screenshot in the PR description).
- [x] 6. MO-1 measured: 5 runs, raw output in `objectives.md`, median and spread. Evidence: MO-1 run 1 in `objectives.md`: raw output of 1 warm-up and 5 runs,
      median 108.7 ms, spread 101.1-335.0 ms.
- [x] 6. MO-1 target met, or missed with the reason written down. Evidence: missed by 8.7 ms. The reason is in `objectives.md`: 42 ms in the shapes
      GROUP BY (a bitmap heap scan per job), about 55 ms in login, OPA and loading the task twice.
- [x] 7. The job filter returns counts for one job only, and the per-job totals add up to the task total.
      Evidence: task 1's ten jobs return 3953, 4156, 4437, 4206, 4090, 4290,
      4247, 4166, 4334 and 3987, which sum to 41,866, the task total; 4 job-filter tests pass (24 in all).
- [x] 7. A job that belongs to another task is rejected with 400. Evidence: `?task_id=1&job_id=11` returns 400
      `{"job_id":["Job 11 does not belong to task 1"]}`.
- [x] 7. The reason for choosing this filter is written down. Evidence: `plan.md`, change at 18:00.

## Stretch (items 8-10)

- [ ] 8. Adding or deleting a box in a job updates the graph without a reload. Evidence:
- [x] 8. MO-3 measured, or skipped with the reason. Evidence: skipped, because item 8 was not built (see "Not done").
- [ ] 9. After the server is stopped and started again, the page shows that it is reconnecting, then recovers and
      refetches. Evidence:
- [x] 10. Decision record written in `plan.md`. Evidence: `plan.md`, section 8.

## Presentation

- [x] The plan was the first commit, and that commit holds no code. Evidence: `535ac8847` adds only
      `docs/plan.md`, `docs/objectives.md` and `docs/definition-of-done.md` (`git show --stat 535ac8847`).
- [x] Commits are small and each one says what changed and why. Evidence: 20 commits plus 4 merges since `b36a49bd5` (`git log --oneline
      b36a49bd5..HEAD`), each a single step with its reason in the message.
- [x] Lint and type checks pass for the changed code. Evidence: on the merged code at 18:20. eslint on the 12 changed TS/TSX files
      reports 0 errors; its 26 warnings are all on lines of `server-proxy.ts` that were already there.
      stylelint on `styles.scss` is clean, `tsc -p cvat-ui/tsconfig.json` exits 0, and `manage.py check` reports
      no issues.
- [x] Backend tests for the counting rule and for refusal pass. Evidence: `docker exec cvat_server python manage.py test --settings
      cvat.settings.production cvat.apps.test` gives "Ran 20 tests ... OK" (14 counting, 6 HTTP).
- [x] `cvat/schema.yml` is regenerated for the new endpoint. Evidence: `b07600dcd`, output of `manage.py spectacular`, +70 lines
      that add only `/api/label-counts`.
- [x] The change is contained: no dead code, no commented-out blocks, no stray files. Evidence: outside `docs/` and `cvat/schema.yml`, 23 files change: the new
      app `cvat/apps/test`, one line each in `cvat/settings/base.py` and `cvat/urls.py`, 5 cvat-core files, the new
      `label-counts-page` folder, and one line each in `cvat-app.tsx` and `actions-menu-items.tsx`. A grep for
      print, console.log, TODO and commented-out code in the new code finds nothing.
- [ ] The PR goes from `dev-test01` into my own fork, not the CVAT repository. Evidence:

## Not done (added at the end)

Each entry gives the item, why it was not reached, and what state it was left in.

- **Item 8 (live updates over WebSocket):** not started. The stretch needed the job filter done by 18:00, and
  it was done at 18:14. Building it would have run past the 20:00 freeze I set to keep time for the recording
  (`plan.md`, change at 18:12). Nothing was written for it, so nothing half-finished is in the code.
- **Item 9 (recover after a dropped connection):** not started, for the same reason. The page does recover from
  a failed request through Retry (item 4), but there is no live connection to recover.
- **MO-3 (live update delay):** not measured, because item 8 does not exist.
- **MO-1 target:** missed by 8.7 ms, and not improved. The likely fixes are written in `objectives.md`, but
  there was no time to build and measure them.
- **Python formatting:** black and isort are not installed in this environment, so the Python files were
  formatted by hand to the repository's 100-character limit and not checked by the tools.
