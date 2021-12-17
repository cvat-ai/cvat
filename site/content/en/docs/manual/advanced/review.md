---
title: 'Review'
linkTitle: 'Review'
weight: 24
description: 'Guide to using the Review mode for task validation.'
---

A special mode to check the annotation allows you to point to an object or area in the frame containing an error.
`Review mode` is not available in 3D tasks.

## Review

To go into review mode, you need to select `Request a review` in the menu and assign the user to run a check.

![](/images/image194.jpg)

After that, the job status will be changed to `validation`
and the reviewer will be able to open the task in review mode.
Review mode is a UI mode, there is a special `Issue` tool which you can use to identify objects
or areas in the frame and describe the problem.

- To do this, first click `Open an issue` icon on the controls sidebar:

  ![](/images/image195.jpg)

- Then click on a place in the frame to highlight the place or highlight the area by holding the left mouse button
  and describe the problem. To select an object, right-click on it and select `Open an issue` or select one
  of several quick issues. The object or area will be shaded in red.

  ![](/images/image231.jpg)

- The created issue will appear in the workspace and in the `Issues` tab on the objects sidebar.

- Once all the problems are marked, save the annotation, open the menu and select `submit the review`.
  After that you'll see a form containing the verification statistics,
  here you can give an assessment of the job and choose further actions:

  - Accept - changes the status of the job to `completed`.
  - Review next – passes the job to another user for re-review.
  - Reject - changes the status of the job to `annotation`.

  ![](/images/image197.jpg)

After the review, other users will be able to see the problems, comment on each issue
and change the status of the problem to `Resolved`.

## Resolve issues

After review, you may see the issues in the `issues` tab in the object sidebar.

- You can use the arrows on the `Issues` tab to navigate the frames that contain problems.

  ![](/images/image196_detrac.jpg)

- In the workspace you can click on issue, you can send a comment on the issue or,
  if the issue is resolved, change the status to `Resolve`.
  You can remove the issue by clicking `Remove` (if your account have the appropriate permissions).

  ![](/images/image232.jpg)

- If few issues were created in one place you can access them by hovering over issue and scrolling the mouse wheel.

  ![](/images/issues_scroll.gif)

If the issue is resolved, you can reopen the issue by clicking the `Reopen` button.
