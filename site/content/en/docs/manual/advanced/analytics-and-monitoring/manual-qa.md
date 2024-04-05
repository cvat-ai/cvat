---
title: 'Manual QA and Review'
linkTitle: 'Manual QA'
weight: 2
description: 'Guidelines on evaluating annotation quality in CVAT manually'
---

In the demanding process of annotation, ensuring accuracy is paramount.

CVAT introduces a specialized **Review mode**, designed to streamline the
validation of annotations by pinpointing errors or discrepancies in annotation.

> **Note**: The **Review mode** is not applicable for 3D tasks.

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

> **Note:** While in review mode, all other tools will be hidden.

**Review** mode screen looks like the following:

![Review mode screen](/images/review_mode_screen.jpg)

### Assigning reviewer

> **Note**: Reviewers can be assigned by project or task owner, assignee, and maintainer.

To assign a reviewer to the job, do the following:

1. Log in to the Owner or Maintainer account.
2. (Optional) If the person you wish to assign as a reviewer
   is not a member of **Organization**, you
   need to {{< ilink "/docs/manual/advanced/organization#invite-members-into-organization"
     "Invite this person to the **Organization**" >}}.
3. Click on the **Assignee** field and select the reviewer.
4. From the **Stage** drop-down list, select **Validation**.

   ![Assigning reviewer](/images/image194.jpg)

### Reporting issues

To report an issue, do the following:

1. Log in to the reviewer's account.
2. On the **Controls** sidebar, click **Open and issue** (![](/images/image195.jpg)).
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

> **Note**: Only project owners and maintainers can assign reviewers.

To assign a corrector to the job, do the following:

1. Log in to the Owner or Maintainer account.
2. (Optional) If the person you wish to assign as a corrector
   is not a member of **Organization**, you
   need to {{< ilink "/docs/manual/advanced/organization#invite-members-into-organization"
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

   ![Change job status](/images/switch_to_standart_mode.jpg)

## Issues navigation and interface

This section describes navigation, interface and
comments section.

### Issues tab

The created issue will appear on the **Objects** sidebar, in the **Issues** tab.

![](/images/image196_detrac.jpg)

It has has the following elements:

<!--lint disable maximum-line-length-->

| Element              | Description                                          |
| -------------------- | ---------------------------------------------------- |
| Arrows               | You can switch between issues by clicking on arrows  |
| Hide all issues      | Click on the eye icon to hide all issues             |
| Hide resolved issues | Click on the check mark to hide only resolved issues |
| Ground truth         | Show ground truth annotations and objects            |

<!--lint enable maximum-line-length-->

### Issues workspace

In the workspace, you can click on the issue, and add a
comment on the issue, remove (**Remove**) it, or resolve (**Resolve**) it.

![](/images/image232.jpg)

To reopen the resolved issue, click **Reopen**.

You can easily access multiple issues created in one
location by hovering over an issue and scrolling the mouse wheel.

![](/images/issues_scroll.gif)

### Issues comments

You can add as many comments as needed to the issue.

In the Objects toolbar, only the first and last comments will be displayed

![](/images/issue_comments.png)

You can copy and paste comments text.

## Manual QA complete video tutorial

This video demonstrates the process:

<!--lint disable maximum-line-length-->

<iframe width="560" height="315" src="https://www.youtube.com/embed/7HxCpjdQt-c?si=xIho-KJLv4b__tRo" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>

<!--lint enable maximum-line-length-->
