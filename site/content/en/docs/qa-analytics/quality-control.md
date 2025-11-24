---
title: 'Quality control'
linkTitle: 'Quality control'
weight: 1
description: 'Overview of quality control features'
aliases:
  - /docs/manual/basics/quality-control/
---

CVAT has the following features for automated quality control of annotations:
- [Validation set configuration for a task](#how-to-enable-quality-control)
- Job validation on job finish ({{< ilink "/docs/qa-analytics/immediate-feedback" "Immediate feedback" >}})
- [Review mode for problems found](#how-to-review-problems-found)
- [Quality analytics](#how-to-check-task-quality-metrics)

In this section, we highlight only the key steps in quality estimation.
Consult the detailed guide on quality estimation in CVAT in the
{{< ilink "/docs/qa-analytics/auto-qa" "Advanced section" >}}.

## How to enable quality control

{{< tabpane text=true >}}

{{%tab header="In a new task" %}}

1. Go to task creation
1. Select the source media, configure other task parameters
1. Scroll down to the **Quality Control** section
1. Select one of the
   {{< ilink "/docs/qa-analytics/auto-qa#validation-modes" "validation modes" >}} available

   ![Create task with validation mode](/images/honeypot09.jpg)

1. Create the task
1. Upload or create Ground Truth annotations in the Ground Truth job in the task
1. Switch the Ground Truth job into the `acceptance` stage and `completed` state

  ![Set job status](/images/honeypot10.jpg)

{{% /tab %}}

{{%tab header="In an existing task" %}}

{{% alert title="Note" color="primary" %}}
For already existing tasks only the Ground Truth validation mode is available. If you want
to use Honeypots for your task, you will need to recreate the task.
{{% /alert %}}

1. Open the task page
1. Select the `+` button next to the job list

   ![Create job](/images/honeypot01.jpg)

1. Select Job Type **Ground truth** and configure the job parameters

   ![Configure job parameters](/images/honeypot02.jpg)

1. Upload or create Ground Truth annotations in the Ground Truth job in the task
1. Switch the Ground Truth job into the `acceptance`stage and `completed` state

   ![Set job status](/images/honeypot10.jpg)

{{% /tab %}}

{{< /tabpane >}}

## How to enable immediate job feedback

{{% alert title="Note" color="primary" %}}
This feature requires a configured validation set in the task. Learn more
in [How to enable quality control](#how-to-enable-quality-control) and in the
{{< ilink "/docs/qa-analytics/auto-qa#configuring-quality-estimation" "full guide" >}}.
{{% /alert %}}

1. Open the task **Actions** menu > **Quality control** > **Settings**
1. Set **Max validations per job** to above zero. 3 is a good starting number

   ![Configure job validations](/images/immediate-feedback-quality-settings.png)

1. Save the updated settings
1. Assign an annotator to an annotation job
1. Annotate the job
1. Mark the job finished using the corresponding button in the menu
1. Once the job is completed, you'll see the job validation dialog

  <img src="/images/immediate-feedback-accept.png" style="max-width: 500px;">

Each assignee gets no more than the specified number of validation attempts.

Learn more about this functionality in the
{{< ilink "/docs/qa-analytics/immediate-feedback" "Immediate Feedback" >}} section.

## How to check task quality metrics

1. Open the task **Actions** menu > **Quality control**
1. (Optional) Request quality metrics computation, and wait for completion
1. Review summaries or detailed reports

   ![Quality Analytics page](/images/honeypot05.png)

Learn more about this functionality
{{< ilink "/docs/qa-analytics/auto-qa#quality-analytics" "here" >}}.

## How to review problems found

1. Open the task **Actions** menu > **Quality control**
1. Find an annotation job to be reviewed, it must have at least 1 validation frame
1. Select the job link
1. Switch to the **Review** mode
1. Enable display of Ground Truth annotations and conflicts

  ![GT conflict](/images/honeypot06.gif)

Learn more about this functionality
{{< ilink "/docs/qa-analytics/auto-qa#reviewing-gt-conflicts" "here" >}}.
