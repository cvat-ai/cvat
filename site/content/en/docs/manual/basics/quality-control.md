---
title: 'Quality control'
linkTitle: 'Quality control'
weight: 21
description: 'Overview of quality control features'
---

CVAT has the following features for automated quality control of annotations:
- [Validation set configuration for a task](#how-to-enable-quality-control-for-a-new-task)
- Job validation on job finish ("{{< ilink "/docs/enterprise/immediate-feedback" "Immediate feedback" >}}")
- [Review mode for problems found](#how-to-review-problems-found)
- [Quality analytics](#how-to-check-task-quality-metrics)

In this section we only highlight the key steps in quality estimation.
Read the detailed guide on quality estimation in CVAT in the {{< ilink "/docs/manual/advanced/analytics-and-monitoring/auto-qa" "Advanced section" >}}.

## How to enable quality control for a new task

1. Go to task creation
1. Select the source media, configure other task parameters
1. Scroll down to the **Quality Control** section
1. Select one of the {{< ilink "/docs/manual/advanced/analytics-and-monitoring/auto-qa#validation-modes" "validation modes" >}} available

![Create task with validation mode](/images/honeypot09.jpg)

1. Create the task
1. Upload or create Ground Truth annotations in the Ground Truth job in the task
1. Switch the Ground Truth job into the `acceptance`-`completed` state

![Set job status](/images/honeypot10.jpg)

## How to enable quality control for an already existing task

> For already existing tasks only the Ground Truth validation mode is available. If you want
> to use Honeypots for your task, you will need to recreate the task.

1. Open the task page
1. Click on the "+" button next to the job list

![Create job](/images/honeypot01.jpg)

1. Select Job Type **Ground truth** and configure the job parameters

![Configure job parameters](/images/honeypot02.jpg)

1. Upload or create Ground Truth annotations in the Ground Truth job in the task
1. Switch the Ground Truth job into the `acceptance`-`completed` state

![Set job status](/images/honeypot10.jpg)

## How to enable immediate job feedback

1. Open the task **Actions** menu > **Quality control** > **Settings**
1. Set **Max validations per job** to above zero. 3 is a good staring number.

![Configure job validations](/images/immediate-feedback-settings-validations.jpg)

1. Save the updated settings
1. Assign an annotator to an annotation job
1. Annotate the job
1. Mark the job finished using the corresponding button in the menu
1. Once the job is completed, you'll see the job validation dialog

![Job validation successful](/images/immediate-feedback-accept.png)

Each assignee gets no more than the specified number of validation attempts.

## How to check task quality metrics

1. Open the task **Actions** menu > **Quality control**
1. (optional) Request quality metrics computation, wait for completion
1. Review summaries or detailed reports

![Quality Analytics page](/images/honeypot05.jpg)

## How to review problems found

1. Open the task **Actions** menu > **Quality control**
1. Find an annotation job to be reviewed, it must have at least 1 validation frame
1. Click the job link
1. Switch to the **Review** mode
1. Enable display of Ground Truth annotations and conflicts

![GT conflict](/images/honeypot06.gif)
