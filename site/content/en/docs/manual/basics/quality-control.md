---
title: 'Quality control'
linkTitle: 'Quality control'
weight: 21
description: 'Overview of quality control features'
---

CVAT has the following features for automated quality control of annotations:
- [Validation set configuration for a task](#how-to-enable-quality-control)
- Job validation on job finish ("{{< ilink "/docs/enterprise/immediate-feedback" "Immediate feedback" >}}")
- [Review mode for problems found](#how-to-review-problems-found)
- [Quality analytics](#how-to-check-task-quality-metrics)

In this section we only highlight the key steps in quality estimation.
Read the detailed guide on quality estimation in CVAT in the
{{< ilink "/docs/manual/advanced/analytics-and-monitoring/auto-qa" "Advanced section" >}}.

## How to enable quality control

{{< tabpane text=true >}}

{{%tab header="In a new task" %}}

1. Go to task creation
2. Select the source media, configure other task parameters
3. Scroll down to the **Quality Control** section
4. Select one of the
{{< ilink "/docs/manual/advanced/analytics-and-monitoring/auto-qa#validation-modes" "validation modes" >}} available

  ![Create task with validation mode](/images/honeypot09.jpg)

5. Create the task
6. Upload or create Ground Truth annotations in the Ground Truth job in the task
7. Switch the Ground Truth job into the `acceptance` stage and `completed` state

  ![Set job status](/images/honeypot10.jpg)

{{% /tab %}}

{{%tab header="In an existing task" %}}

> For already existing tasks only the Ground Truth validation mode is available. If you want
> to use Honeypots for your task, you will need to recreate the task.

1. Open the task page
2. Click the `+` button next to the job list

  ![Create job](/images/honeypot01.jpg)

3. Select Job Type **Ground truth** and configure the job parameters

  ![Configure job parameters](/images/honeypot02.jpg)

4. Upload or create Ground Truth annotations in the Ground Truth job in the task
5. Switch the Ground Truth job into the `acceptance`stage and `completed` state

  ![Set job status](/images/honeypot10.jpg)

{{% /tab %}}

{{< /tabpane >}}

## How to enable immediate job feedback

> **Note**: This feature requires a configured validation set in the task. Read more
> in [How to enable quality control](#how-to-enable-quality-control) and in the
> {{< ilink "/docs/manual/advanced/analytics-and-monitoring/auto-qa#configuring-quality-estimation" "full guide" >}}.

1. Open the task **Actions** menu > **Quality control** > **Settings**
2. Set **Max validations per job** to above zero. 3 is a good starting number.

  ![Configure job validations](/images/immediate-feedback-quality-settings.png)

3. Save the updated settings
4. Assign an annotator to an annotation job
5. Annotate the job
6. Mark the job finished using the corresponding button in the menu
7. Once the job is completed, you'll see the job validation dialog

  <img src="/images/immediate-feedback-accept.png" style="max-width: 500px;">

Each assignee gets no more than the specified number of validation attempts.

Read more about this functionality in the
{{< ilink "/docs/enterprise/immediate-feedback" "Immediate Feedback" >}} section.

## How to check task quality metrics

1. Open the task **Actions** menu > **Quality control**
2. (optional) Request quality metrics computation, wait for completion
3. Review summaries or detailed reports

  ![Quality Analytics page](/images/honeypot05.png)

Read more about this functionality
{{< ilink "/docs/manual/advanced/analytics-and-monitoring/auto-qa#quality-analytics" "here" >}}.

## How to review problems found

1. Open the task **Actions** menu > **Quality control**
2. Find an annotation job to be reviewed, it must have at least 1 validation frame
3. Click the job link
4. Switch to the **Review** mode
5. Enable display of Ground Truth annotations and conflicts

  ![GT conflict](/images/honeypot06.gif)

Read more about this functionality
{{< ilink "/docs/manual/advanced/analytics-and-monitoring/auto-qa#reviewing-gt-conflicts" "here" >}}.
