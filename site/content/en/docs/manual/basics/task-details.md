---
title: 'Task details'
linkTitle: 'Task details'
weight: 6
description: 'Overview of the Task details page.'
---

Task details is a task page which contains a preview, a progress bar
and the details of the task (specified when the task was created) and the jobs section.

![](/images/task-details-1.png)

- The next actions are available on this page:
  1. Change the task’s title.
  1. Open `Actions` menu.
  1. Change issue tracker or open issue tracker if it is specified.
  1. Change labels (available only if the task is not related to the project).
     You can add new labels or add attributes for the existing labels in the Raw mode or the Constructor mode.
     By clicking `Copy` you will copy the labels to the clipboard.
  1. Assigned to — is used to assign a task to a person. Start typing an assignee’s name and/or
     choose the right person out of the dropdown list.
     In the list of users, you will only see the users of the
     {{< ilink "/docs/manual/advanced/organization" "organization" >}}
     where the task is created.

- **Jobs** — is a list of all jobs for a particular task. Here you can find the next data:
  - Jobs name with a hyperlink to it.
  - Frame range — the frame interval.
  - A stage of the job. The stage is specified by a drop-down list.
    There are three stages: `annotation`, `validation` or `acceptance`. This value affects the task progress bar.
  - A state of the job. The state can be changed by an assigned user in the menu inside the job.
    There are several possible states: `new`, `in progress`, `rejected`, `completed`.
  - Duration — is the amount of time the job is being worked.
  - Assignee is the user who is working on the job (annotator,
    {{< ilink "/docs/manual/advanced/analytics-and-monitoring/manual-qa" "reviewer or corrector" >}}).
    You can start typing an assignee’s name and/or choose the right person out of the dropdown list.

  You can filter or sort jobs by status, assignee and updated date using filters panel.

Follow a link inside `Jobs` section to start annotation process.
In some cases, you can have several links. It depends on size of your
task and `Overlap Size` and `Segment Size` parameters. To improve
UX, only the first chunk of several frames will be loaded and you will be able
to annotate first images. Other frames will be loaded in background.

![](/images/task-details-2.png)
