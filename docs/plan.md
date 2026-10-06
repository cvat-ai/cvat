# Plan — Annotation Analytics

## Goal

Add a feature to CVAT that shows how many annotations each label has in a task, as a bar chart.

- Branch: `dev-test01`
- Starting commit: `d8193c584be9ce6cf9882dad06c0dd920cc0b9c5` (CVAT 2.77.1)
- Time: 8 hours. Setup and download time is not counted.
- Test data: 1000 COCO pictures in task 1, with 7,204 labelled objects.

## What I will do, in order

| # | Step | Time |
|---|------|------|
| 1 | Write this plan, the objectives and the definition of done. Commit them before any code. | 30 min |
| 2 | Build the API in a new Django app named `test`, as the brief asks. It takes a task number and returns the count for each label. The counting is done by the database. | 1 h 15 min |
| 3 | Write a test that checks the API returns the right counts. | (included in step 2) |
| 4 | Build the page. It calls the API and shows the counts as a bar chart. | 1 h |
| 5 | Handle the two problem cases on the page: a task with no annotations, and a failed request. | 30 min |
| 6 | Check access. A user who is not logged in gets an error. A user without access to the task gets an error. Save proof of both. | 30 min |
| 7 | Measure the speed of the API 5 times and write down the results. | 45 min |
| 8 | Add one extra option: show the counts split by shape type (box, polygon, mask). | 30 min |
| 9 | Make the chart update by itself when someone adds or removes an annotation. | 1 h 15 min |
| 10 | Make the page reconnect by itself if the connection drops. | 30 min |
| 11 | Write down my main decision (see the end of this file). | 15 min |
| 12 | Finish the documents, clean up the code, open the pull request. | 30 min |
| 13 | Record the video. | 20 min |
| | **Total** | **7 h 50 min** |

Steps 2 to 5 are the minimum. I will not start step 9 until step 5 works.

## How I will count

- Annotations are saved per job, and a task is made of jobs. To count for one task, I take all the jobs of that task, count their annotations, and group the counts by label.
- Some objects are saved as more than one shape. For example, a person partly hidden behind a pole is saved as two shapes, and CVAT gives both shapes the same group number. I count these shapes as one object.
- This makes my total 7,204, which matches the COCO file exactly. Without this rule the total would be 8,109.

## Why I chose "split by shape type" for step 8

Different models need different shape types. A model that draws boxes needs boxes, and a model that outlines objects needs polygons or masks. My test data already has polygons and masks, so the split shows real numbers.

## What I will not do

- No new database tables.
- No counts across several tasks or projects.
- No automated browser tests. I will test the API automatically and show the page with screenshots.
- No changes to CVAT's existing access rules. I reuse them.

## Risks

- Step 9 needs a live connection between the page and the server. Checking who is logged in on that connection may need extra work. If it takes too long, I will stop and write down why.
- The CVAT I am running was downloaded ready-made and does not contain my code. I will build it from my own code. If that fails, I will write down what I did instead.

## Changes to this plan

| When | What changed | Why |
|------|--------------|-----|

## Main decision

To be written at step 11: what approach I chose, what approach I rejected, and what rejecting it cost.
