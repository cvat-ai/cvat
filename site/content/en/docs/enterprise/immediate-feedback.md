---
title: 'Immediate job feedback'
linkTitle: 'Immediate job feedback'
weight: 5
description: 'Quick responses about job annotation quality'
---

## Overview

The basic idea behind this feature is to provide annotators with quick feedback on their
performance in a job. When an annotator finishes a job, a dialog is displayed showing the
quality of their annotations. The annotator can either agree or disagree with the feedback.
If they disagree, they have the option to re-annotate the job and request feedback again.

To ensure transparency with the annotator, the immediate feedback shows the computed score and
the minimum required score. Information about the specific errors or frames that have errors is
not available to annotators.

Feedback is only available a limited number of times for each assignment, to prevent
Ground Truth revealing by annotators. This is controlled by a configurable parameter, so
it can be adjusted to the requirements of each project.

## How to configure

Immediate feedback settings, such as `Target metric`, `Target metric threshold`,
`Max validations per job` and others, can be configured on the quality settings page.

This feature is considered enabled if the `Max validations per job` is above 0. You can change
the parameters any time.

> **Note**: This feature requires a configured validation set in the task. Read more
> in the
> {{< ilink "/docs/manual/basics/quality-control#how-to-enable-quality-control" "quality overview" >}}
> section or in the
{{< ilink "/docs/manual/advanced/analytics-and-monitoring/auto-qa#configuring-quality-estimation" "full guide" >}}.

1. Open the task **Actions** menu > **Quality control** > **Settings**

  ![Configure job validations](/images/immediate-feedback-quality-settings.png)

2. Set the `Target metric` and `Target metric threshold` values to what is required in your project.
3. Set **Max validations per job** to above zero. 3 is a good starting number.
4. Save the updated settings

## How to receive a feedback

1. Assign an annotator to an annotation job
2. Annotate the job
3. Mark the job finished using the corresponding button in the menu
4. Once the job is completed, you'll see the job validation dialog

  <img src="/images/immediate-feedback-accept.png" style="max-width: 500px;">

Each assignee gets no more than the specified number of validation attempts.

> **Note**: this functionality is only available in regular annotation jobs. For instance,
> it's not possible to use it in Ground Truth jobs.

### Available feedbacks

There are three types of feedbacks available for different cases:
- Accepted
- Rejected, with an option to fix mistakes
- Finally rejected when the number of attempts is exhausted

<img src="/images/immediate-feedback-accept.png" style="max-width: 300px;">
<img src="/images/immediate-feedback-reject.png" style="max-width: 300px;">
<img src="/images/immediate-feedback-final-reject.png" style="max-width: 300px;">

## Additional details

> Immediate feedback has a default timeout of 20 seconds.
> Feedback may be unavailable for large jobs or when there are too many immediate feedback requests.
> In this case annotators do not see any feedback dialogs and annotate jobs as
> if the feature was disabled.

> The number of attempts does not decrease for staff members who have access to a job
> with ground truth annotations. For instance, if you're trying to test this feature as the task
> owner, you may be confused if you see the number of attempts doesn't decrease.

> The number of attempts resets when the job assignee is updated.
