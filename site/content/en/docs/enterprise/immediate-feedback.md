---
title: 'Immediate job feedback'
linkTitle: 'Immediate job feedback'
weight: 5
description: 'This feature provides annotators with general feedback on their performance in a job.'
---

When an annotator finishes a job, a dialog is displayed showing the quality of their annotations.
The annotator can either agree or disagree with the feedback.
If they disagree, they have the option to re-annotate the job and request feedback again.
However, feedback is only available a limited number of times, as specified in the task's quality settings.

To ensure transparency with the annotator, the immediate feedback shows the collected score and 
the minimum required score.
Immediate feedback settings, such as `Target metric`, `Target metric threshold`, 
`Max validations per job` and others, can be configured on the quality settings page:
<!--- TODO: Update quality page documentation and refer from this section -->

<img src="/images/immediate-feedback-quality-settings.png" style="max-width: 600px;">

### Available feedbacks

There are three types of feedbacks available for different cases:
- Accepted
- Rejected, but can be adjusted
- Finally rejected when the number of attempts is exhausted

<img src="/images/immediate-feedback-accept.png" style="max-width: 300px;">
<img src="/images/immediate-feedback-reject.png" style="max-width: 300px;">
<img src="/images/immediate-feedback-final-reject.png" style="max-width: 300px;">

Notes:

> Immediate feedback has a default timeout of 20 seconds.
Feedback may be unavailable for large jobs or when there are too many immediate feedback requests.
In this case annotators do not see any feedback dialogs.

> The number of attempts does not decrease for staff members who have access to a job with ground truth annotations.

> The number of attempts resets when the job assignee is updated.

Requirements:
1. The task is configured with a Ground Truth job that has been annotated, 
moved to the acceptance stage, and is in the completed state.
2. The current job is in the annotation stage.
3. The current job is a regular annotation job. Immediate feedback is not available for Ground Truth jobs
4. The `Max validations per job` setting has been configured on the quality settings page. 



