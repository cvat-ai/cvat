---
title: 'Manual QA and Review'
linkTitle: 'Manual QA'
weight: 2
description: 'Guidelines on evaluating annotation quality in CVAT manually'
aliases:
  - /docs/manual/advanced/analytics-and-monitoring/manual-qa/
---

In the demanding process of annotation, ensuring accuracy is paramount.

CVAT introduces a specialized **Review mode**, designed to streamline the
validation of annotations by pinpointing errors or discrepancies in annotation.

{{% alert title="Note" color="primary" %}}
For 3D tasks, **Review mode** supports issue pins, optional object or track links,
and frame ranges in the point cloud.
See [Reviewing 3D tasks](#reviewing-3d-tasks).
{{% /alert %}}

See:

- [Review and report issues: review only mode](#review-and-report-issues-review-only-mode)
  - [Assigning reviewer](#assigning-reviewer)
  - [Reporting issues](#reporting-issues)
  - [Quick issue](#quick-issue)
  - [Assigning corrector](#assigning-corrector)
  - [Correcting reported issues](#correcting-reported-issues)
- [Review and report issues: review and correct mode](#review-and-report-issues-review-and-correct-mode)
- [Issues navigation and interface](#issues-navigation-and-interface)
  - [Issues tab](#issues-tab)
  - [Issues workspace](#issues-workspace)
  - [Issues comments](#issues-comments)
- [Manual QA complete video tutorial](#manual-qa-complete-video-tutorial)

## Review and report issues: review only mode

Review mode is a user interface (UI) setting where a specialized
**Issue** tool is available. This tool allows you to identify
and describe issues with objects or areas within the frame.

{{% alert title="Note" color="primary" %}}
While in review mode, all other tools will be hidden.
{{% /alert %}}

**Review** mode screen looks like the following:

![Review mode screen](/images/review_mode_screen.jpg)

### Assigning reviewer

{{% alert title="Note" color="primary" %}}
Reviewers can be assigned by project or task owner, assignee, and maintainer.
{{% /alert %}}

To assign a reviewer to the job, do the following:

1. Log in to the Owner or Maintainer account.
2. (Optional) If the person you wish to assign as a reviewer
   is not a member of **Organization**, you
   need to {{< ilink "/docs/account_management/organization#invite-members-into-organization"
     "Invite this person to the **Organization**" >}}.
3. Click on the **Assignee** field and select the reviewer.
4. From the **Stage** drop-down list, select **Validation**.

   ![Assigning reviewer](/images/image194.jpg)

### Reporting issues

To report an issue, do the following:

1. Log in to the reviewer's account.
2. On the **Controls** sidebar, click **Open and issue** (![Open an issue button](/images/image195.jpg)).
3. Click on the area of the frame where the issue is occurring,
   and the **Issue report popup** will appear.

   ![Issue report window](/images/issue_report.jpg)

4. In the text field of the **Issue report popup**, enter the issue description.
5. Click **Submit**.

### Quick issue

The **Quick issue** function streamlines the review process.
It allows reviewers to efficiently select from a list of
previously created issues or add a new one,
facilitating a faster and more organized review.

![Quick issue](/images/image231.jpg)

To create a **Quick issue** do the following:

1. Right-click on the area of the frame where the issue is occurring.
2. From the popup menu select one of the following:

   - **Open an issue...**: to create new issue.
   - **Quick issue: incorrect position**: to report incorrect position of the label.
   - **Quick issue: incorrect attribute**: to report incorrect attribute of the label.
   - **Quick issue...**: to open the list of issues that were reported by you before.

### Assigning corrector

{{% alert title="Note" color="primary" %}}
Only project owners and maintainers can assign reviewers.
{{% /alert %}}

To assign a corrector to the job, do the following:

1. Log in to the Owner or Maintainer account.
2. (Optional) If the person you wish to assign as a corrector
   is not a member of **Organization**, you
   need to {{< ilink "/docs/account_management/organization#invite-members-into-organization"
     "Invite this person to the **Organization**" >}}.
3. Click on the **Assignee** field and select the reviewer.
4. From the **Stage** drop-down list, select **Annotation**.

   ![Assigning corrector](/images/image194_1.jpg)

### Correcting reported issues

To correct the reported issue, do the following:

1. Log in to the corrector account.
2. Go to the reviewed job and open it.
3. Click on the issue report, to see details of
   what needs to be corrected.

   ![Issue report label](/images/issue_report_label.jpg)

4. Correct annotation.
5. Add a comment to the issue report and click **Resolve**.

   ![Issue report](/images/resolve_issue.jpg)

6. After all issues are fixed save work, go to the **Menu** select the **Change the job state** and
   change state to **Complete**.

   ![Change job status](/images/image197.jpg)

## Review and report issues: review and correct mode

The person, assigned as [assigned as reviewer](#assigning-reviewer)
can switch to correction mode and correct all annotation issues.

To correct annotation issues as a reviewer, do the following:

1. Log in to the reviewer account.
2. Go to the assigned job and open it.
3. In the top right corner, from the drop-down list,
   select **Standard**.

   ![Change job status](/images/switch_to_standard_mode.jpg)

## Issues navigation and interface

This section describes navigation, interface and
comments section.

### Issues tab

The created issue will appear on the **Objects** sidebar, in the **Issues** tab.

![Example of "Issues" tab with highlighted buttons and issue list](/images/image196_detrac.jpg)

It has has the following elements:

| Element              | Description                                          |
| -------------------- | ---------------------------------------------------- |
| Arrows               | You can switch between issues by clicking on arrows  |
| Hide all issues      | Click on the eye icon to hide all issues             |
| Hide resolved issues | Click on the check mark to hide only resolved issues |
| Ground truth         | Show ground truth annotations and objects            |

### Issues workspace

In the workspace, you can click on the issue, and add a
comment on the issue, remove (**Remove**) it, or resolve (**Resolve**) it.

![Example of "Issue" window with its settings](/images/image232.jpg)

To reopen the resolved issue, click **Reopen**.

You can easily access multiple issues created in one
location by hovering over an issue and scrolling the mouse wheel.

![Example of scrolling by issues created in one location in interface](/images/issues_scroll.gif)

### Issues comments

You can add as many comments as needed to the issue.

In the Objects toolbar, only the first and last comments will be displayed

![Issue comment example](/images/issue_comments.png)

You can copy and paste comments text.

## Reviewing 3D tasks

1. Open a 3D job and select **Review** in the workspace selector.
2. Click **Open an issue** (or press **N**), then click a cuboid or a point in the
   perspective view. You can drag to rotate the scene while choosing a location;
   dragging does not place an issue. Empty background cannot be used to place a pin.
3. Enter a description in the popup beside the selected location. Leave **Applies
   to** as **Point only**, or choose a cuboid shape or track. Set **From frame**
   and **To frame** to include the frames affected by the issue, then click
   **Submit**. Both endpoints are included. Issue labels appear at the same XYZ
   location in the perspective, top, side, and front views on those frames,
   showing the first comment just as in 2D. Unsaved linked annotations are saved
   when the issue is submitted.
4. Click an issue label to open its discussion on the perspective canvas or in
   an expanded 3D view. You can
   add comments, resolve the issue, or reopen it. Hover over an item in the
   **Issues** tab to highlight its location; click it to focus the issue.
   **Select** in the discussion selects and focuses the
   linked annotation. The discussion and sidebar also show the issue's frame range.
5. Use the **Issues** tab arrows to jump to previous or next frames containing
   issues. The visibility buttons hide all pins or hide resolved issues.
6. Drag an issue's point marker or label in **Top**, **Side**, or **Front** to
   reposition it along the view plane, keeping its depth in that view. All views
   update together. Release to save the position, or press **Escape** to cancel.
   You can also adjust a new marker before submitting its description.

An expanded pane shows only its own issue markers and discussion. Expanding a
camera image hides the 3D issue overlays. Unfinished comments and issue descriptions
are retained when expanding and restoring views.

You can also right-click a selected cuboid to create an issue at its center,
including quick issues. These issues link to the selected shape or track
automatically. The pin remains independently draggable; moving it does not move
the annotation or remove the link. Pins keep their XYZ location when annotations
are edited. If a linked annotation is deleted or absent on a frame, its discussion
and marker remain available. Switch to **Standard 3D** to edit annotations;
existing issues and comments remain available there.

## Manual QA complete video tutorial

This video demonstrates the process:

<iframe width="560" height="315" src="https://www.youtube.com/embed/7HxCpjdQt-c?si=xIho-KJLv4b__tRo" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
