# Definition of Done — Annotation Analytics

This is my checklist for deciding when the work is finished. I wrote it before writing any code.

At the end, I tick each line and add proof next to it: a number, a command output, a screenshot or a link. A line with no proof is not done.

Step numbers refer to the steps in `plan.md`. Screenshots are in [`docs/evidence/`](evidence/).

## API (steps 2–3)

- [x] The API returns the correct count for each label in task 1. Checked against the COCO file: 7,204 in total, and every label matches. Proof:
  ```
  COCO file total: 7204 | API total: 7204 | labels compared: 80 | mismatched labels: none
  ```
  The database holds 8,109 shape rows for these 7,204 objects; `plan.md` explains why.
- [x] The counting is done by the database, not by a loop in my code. Proof: [`cvat/apps/test/counts.py` lines 30–51](../cvat/apps/test/counts.py#L30-L51) (shapes, tracks and tags). The database groups the shapes by label and counts them (`Count(...)`). My code only adds up at most three small result rows per label (shapes, tracks, tags).
- [x] An automatic test with a small task of known counts passes. Proof: [`test_annotation_counts.py`](../cvat/apps/test/tests/test_annotation_counts.py), run with `python manage.py test cvat.apps.test`:
  ```
  test_counts_objects_per_label ... ok
  test_counts_per_shape_type ... ok
  test_owner_can_see_counts ... ok
  test_request_without_login_is_refused ... ok
  test_task_without_annotations ... ok
  test_unknown_grouping_is_refused ... ok
  test_user_without_access_is_refused ... ok
  Ran 7 tests in 3.494s
  OK
  ```

## Page (steps 4–5)

- [x] The page opens from the task page and shows the counts as a bar chart. Proof: [actions-menu.png](evidence/actions-menu.png) ("Annotation counts" in the task's Actions menu), [chart.png](evidence/chart.png) ("7204 annotations in 79 of 80 labels").
- [x] A task with no annotations shows a "no annotations yet" message instead of an empty chart. Proof: [empty-task.png](evidence/empty-task.png) (task 2).
- [x] A failed request shows an error message and a "try again" button. Proof: [failed-request.png](evidence/failed-request.png). I made the server's answer fail on purpose in the browser. Clicking "Try again" afterwards loaded the chart again.

## Access (step 6)

- [x] A user who is not logged in is refused. Proof:
  ```
  $ curl http://localhost:8080/api/test/tasks/1/annotation-counts
  {"detail":"Authentication credentials were not provided."}
  HTTP 401
  ```
- [x] The user `viewer`, who has no access to task 1, is refused. Proof:
  ```
  $ curl -u viewer:*** http://localhost:8080/api/test/tasks/1/annotation-counts
  {"detail":"You do not have permission to perform this action."}
  HTTP 403
  ```
- [x] The owner of task 1 gets the counts. Proof: the owner of task 1 is `admin`:
  ```
  $ curl -u admin:*** http://localhost:8080/api/test/tasks/1/annotation-counts
  HTTP 200
  {"task_id":1,"total":7204,"labels":[{"label_id":1,"name":"person","color":"#c06060","count":2251}, ...
  ```
  `admin` is also a superuser, so the test `test_owner_can_see_counts` checks the same rule with an ordinary user who owns the task (passes, see above).

## Speed (step 7)

- [x] MO-1 measured 5 times, with the raw output saved in `objectives.md`. Proof: median **99.2 ms**, spread 89.6 ms ([objectives.md, MO-1](objectives.md#mo-1--how-fast-the-api-returns-the-counts)).
- [x] The old way also measured 5 times, for comparison. Proof: median **1,260.8 ms**, spread 486.7 ms (same section).
- [x] Target met, or missed with the reason written down. Proof: met, but only just: 99.2 ms against 100 ms. The spread is large, so another run could miss it. The counting itself takes a steady ~16 ms; the rest is CVAT's request handling. All of this is written in `objectives.md`.

## Extra features (steps 8–10)

- [x] Counts split by shape type work in the API and on the page. Proof:
  ```
  $ curl -u admin:*** ".../api/test/tasks/1/annotation-counts?group_by=shape_type"
  {"task_id":1,"total":7204,"labels":[{"label_id":1,"name":"person",...,"count":2251,"shape_types":{"mask":52,"polygon":2199}}, ...
  totals by type: {'mask': 87, 'polygon': 7117} | sum 7204
  ```
  and [split-by-shape-type.png](evidence/split-by-shape-type.png).
- [x] Adding an annotation updates the open chart without reloading the page. Proof: [empty-task.png](evidence/empty-task.png) (before) and [live-update.png](evidence/live-update.png) (after a box was saved through the API, ~151 ms later, no reload).
- [x] MO-2 measured 5 times, with the raw output saved in `objectives.md`. Proof: median **243.2 ms**, spread 95.2 ms, target 1 s: met ([objectives.md, MO-2](objectives.md#mo-2--how-fast-the-chart-updates-by-itself)).
- [x] When the server stops, the page shows "Reconnecting…". When the server starts again, the page loads the new counts. Proof: [reconnecting.png](evidence/reconnecting.png) (server stopped) and [reconnected.png](evidence/reconnected.png) (server started again, a box added, the page back to "Live" and showing it). Times from the run: server stopped at 13.6 s, "Reconnecting…" shown at 13.6 s, server back at 76.0 s, page "Live" with the new count at 76.6 s.

## Documents and code (steps 1, 11–12)

- [x] The three documents were committed before any code. Proof: the first commit on the branch, [b070e85](https://github.com/Ahmed-Silat/cvat/commit/b070e8589), contains only `docs/plan.md`, `docs/objectives.md` and `docs/definition-of-done.md`.
- [x] Each commit is small and its message says what changed and why. Proof: commit list (`git log --oneline develop..dev-test01`):
  ```
  b070e85 Add plan, objectives and definition of done before implementation
  af237e9 Add API that counts a task's annotations per label
  c5bee7f Add tests for the annotation counts API
  6518268 Add annotation counts page with bar chart, empty and error states
  27e0246 Record plan changes made during steps 2 to 4
  4d50942 Measure the counts API speed (MO-1) and record the results
  033c5c7 Add option to split annotation counts by shape type
  b14c75c Update the annotation counts chart live over WebSocket
  379f2d4 Reconnect the live counts page when the connection drops
  1c25403 Measure the live update speed (MO-2) and record the results
  6e1e3b6 Write the main decision record in the plan
  ```
- [x] No unused code, no commented-out code, no leftover files. Proof: I searched every line I added for debug output, TODOs and commented-out code. None found, apart from the `console.log` lines that print the MO-2 script's results. Changed files outside my own folders (`cvat/apps/test/`, `cvat-ui/src/components/annotation-counts-page/`, `docs/`): `cvat/settings/base.py` (+1 line, turns the app on), `cvat/urls.py` (+3, the API address), `cvat/asgi.py` (+8, the WebSocket), `cvat-app.tsx` (+6, the page address), `actions-menu-items.tsx` (+6, the menu entry).
- [x] My main decision is written at the end of `plan.md`. Proof: [plan.md, Main decision](plan.md#main-decision).

## Submission (step 13)

- [x] Everything I did not finish is listed below, with the reason.
- [ ] Pull request opened from `dev-test01` into my own fork, not the real CVAT project. Proof: _link added when opened_
- [ ] Video of 5 minutes or less, answering the four questions. Proof: _link added when recorded_

## Not finished

- **No automated tests for the page or the live connection.** I checked them in a real browser and with small scripts (results and screenshots above), but these checks are not saved as tests in the repository. Reason: time; browser tests were in "What I will not do" from the start.
- **The code style checker (ESLint) was not run on the page code.** It needs a newer Node version than my laptop has (20.17). The TypeScript checker ran with 0 errors, and the page was built and tested in a browser.
- **The live connection cannot tell "not logged in" apart from "no access".** A refused WebSocket connection reports both as 403. The normal API still returns 401 and 403 correctly.
- **One Redis connection per open page.** Fine for a few annotators; for thousands of open pages a shared message layer would be needed (see "Main decision" in `plan.md`).
- **A rare case in the shape-type split.** If one grouped object were made of different shape types (for example a polygon and a mask in the same group), it would be counted once for each type, so that label's types would add up to more than its total. The COCO data never does this (the types add up exactly to 7,204).
