# Definition of Done

Written before any code. A line is only ticked when there is evidence beside it: a number, a
command with its output, a commit, or a screenshot. A tick with no evidence counts as not done.

## The floor (items 1 to 4)

- [ ] The endpoint returns counts per class for a task.
  Evidence:
- [ ] The counts are correct. I counted the same classes straight from the COCO annotation
  file for the images I uploaded, and the two sets of numbers match.
  Evidence:
- [ ] The page opens from the task menu and calls the endpoint.
  Evidence:
- [ ] The counts are drawn as a bar chart, one bar per class.
  Evidence:
- [ ] A task with no annotations shows a clear "no annotations yet" message, not a blank chart.
  Evidence:
- [ ] When the request fails, the page shows an error message and a way to retry. Tested by
  stopping the server.
  Evidence:

## Access (item 5)

- [ ] A request with no login is refused.
  Evidence:
- [ ] A logged-in user with no access to the task is refused.
  Evidence:
- [ ] A user who can open the task gets the counts.
  Evidence:

## Speed (item 6)

- [ ] The target was written in `Objectives.md` before I measured anything.
  Evidence:
- [ ] Measured 5 times, raw output saved in `Objectives.md`.
  Evidence:
- [ ] Target met, or missed with the reason written down.
  Evidence:

## Grouping (item 7)

- [ ] The page can show counts for a single job, and the numbers for all jobs add up to the
  task total.
  Evidence:

## Live updates (items 8 and 9)

- [ ] Adding or deleting an annotation in one browser tab changes the chart in another tab
  without a refresh.
  Evidence:
- [ ] After the server is restarted, the page reconnects by itself and shows the current counts.
  Evidence:

## Housekeeping

- [ ] The plan was the first commit, before any code.
  Evidence:
- [ ] Every commit message says what changed and why.
  Evidence:
- [ ] No leftover files, commented-out code or unused code in the pull request.
  Evidence:
- [ ] The pull request goes into my own fork, not the real CVAT repository.
  Evidence:
- [ ] Recording is 5 minutes or less and answers all four questions.
  Evidence:

## Not finished

Everything I did not reach is listed here, with the reason.

- Nothing yet.
