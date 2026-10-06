# Definition of Done — Annotation Analytics

This is my checklist for deciding when the work is finished. I wrote it before writing any code.

At the end, I tick each line and add proof next to it: a number, a command output, a screenshot or a link. A line with no proof is not done.

Step numbers refer to the steps in `plan.md`.

## API (steps 2–3)

- [ ] The API returns the correct count for each label in task 1. Checked against the COCO file: 7,204 in total, and every label matches. Proof:
- [ ] The counting is done by the database, not by a loop in my code. Proof: file and line
- [ ] An automatic test with a small task of known counts passes. Proof:

## Page (steps 4–5)

- [ ] The page opens from the task page and shows the counts as a bar chart. Proof: screenshot
- [ ] A task with no annotations shows a "no annotations yet" message instead of an empty chart. Proof: screenshot
- [ ] A failed request shows an error message and a "try again" button. Proof: screenshot

## Access (step 6)

- [ ] A user who is not logged in is refused. Proof: command output
- [ ] The user `viewer`, who has no access to task 1, is refused. Proof: command output
- [ ] The owner of task 1 gets the counts. Proof: command output

## Speed (step 7)

- [ ] MO-1 measured 5 times, with the raw output saved in `objectives.md`. Proof: median and spread
- [ ] The old way also measured 5 times, for comparison. Proof: median and spread
- [ ] Target met, or missed with the reason written down. Proof:

## Extra features (steps 8–10)

- [ ] Counts split by shape type work in the API and on the page. Proof: command output and screenshot
- [ ] Adding an annotation updates the open chart without reloading the page. Proof: screenshots before and after
- [ ] MO-2 measured 5 times, with the raw output saved in `objectives.md`. Proof: median and spread
- [ ] When the server stops, the page shows "Reconnecting…". When the server starts again, the page loads the new counts. Proof: screenshots

## Documents and code (steps 1, 11–12)

- [ ] The three documents were committed before any code. Proof: commit link
- [ ] Each commit is small and its message says what changed and why. Proof: commit list
- [ ] No unused code, no commented-out code, no leftover files. Proof: list of changed files
- [ ] My main decision is written at the end of `plan.md`. Proof: link

## Submission (step 13)

- [ ] Everything I did not finish is listed below, with the reason.
- [ ] Pull request opened from `dev-test01` into my own fork, not the real CVAT project. Proof: link
- [ ] Video of 5 minutes or less, answering the four questions. Proof: link

## Not finished

_To fill in at the end._
