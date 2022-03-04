---
title: 'Review'
linkTitle: 'Review'
weight: 24
description: 'Guide to using the Review mode for task validation.'
---

A special mode to check the annotation allows you to point to an object or area in the frame containing an error.
`Review mode` is not available in 3D tasks.

## Review

To conduct a review, you need to change the stage to `validation` for the desired job on the task page and assign
a user who will conduct the check. Now the job will open in a fashion review. You can also switch to the `Review` mode
using the [`UI switcher`](/docs/manual/basics/top-panel/#ui-switcher) on the top panel.

![](/images/image194.jpg)

Review mode is a UI mode, there is a special `Issue` tool which you can use to identify objects
or areas in the frame and describe the issue.

- To do this, first click `Open an issue` icon on the controls sidebar:

  ![](/images/image195.jpg)

- Then click on a place in the frame to highlight the place or highlight the area by holding the left mouse button
  and describe the issue. To select an object, right-click on it and select `Open an issue` or select one
  of several quick issues. The object or area will be shaded in red.

  ![](/images/image231.jpg)

- The created issue will appear in the workspace and in the `Issues` tab on the objects sidebar.

- Once all the issues are marked, save the annotation, open the menu and select job state `rejected` or `completed`.

  ![](/images/image197.jpg)

After the review, other users will be able to see the issues, comment on each issue
and change the status of the issue to `Resolved`.

After the issues are fixed select `Finish the job` from the menu to finish the task.
Or you can switch stage to `acceptance` on the task page.

## Resolve issues

After review, you may see the issues in the `Issues` tab in the object sidebar.

- You can use the arrows on the `Issues` tab to navigate the frames that contain issues.

  ![](/images/image196_detrac.jpg)

- In the workspace you can click on issue, you can send a comment on the issue or,
  if the issue is resolved, change the status to `Resolve`.
  You can remove the issue by clicking `Remove` (if your account have the appropriate permissions).

  ![](/images/image232.jpg)

- If few issues were created in one place you can access them by hovering over issue and scrolling the mouse wheel.

  ![](/images/issues_scroll.gif)

If the issue is resolved, you can reopen the issue by clicking the `Reopen` button.
