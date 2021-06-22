---
title: 'Task details'
linkTitle: 'Task details'
weight: 3
---

Task details is a task page which contains a preview, a progress bar
and the details of the task (specified when the task was created) and the jobs section.

![](/images/image131_detrac.jpg)

- The next actions are available on this page:
  1. Change the task’s title.
  2. Open `Actions` menu.
  3. Change issue tracker or open issue tracker if it is specified.
  4. Change labels (available only if the task is not related to the project).
     You can add new labels or add attributes for the existing labels in the Raw mode or the Constructor mode.
     By clicking `Copy` you will copy the labels to the clipboard.
  5. Assigned to — is used to assign a task to a person. Start typing an assignee’s name and/or
     choose the right person out of the dropdown list.
- `Jobs` — is a list of all jobs for a particular task. Here you can find the next data:
  - Jobs name with a hyperlink to it.
  - Frames — the frame interval.
  - A status of the job. The status is specified by the user in the menu inside the job.
    There are three types of status: annotation, validation or completed.
    The status of the job is changes the progress bar of the task.
  - Started on — start date of this job.
  - Duration — is the amount of time the job is being worked.
  - Assignee is the user who is working on the job.
    You can start typing an assignee’s name and/or choose the right person out of the dropdown list.
  - Reviewer – a user assigned to carry out the review,
    read more in the [review](/docs/manual/advanced/review/) section.
  - `Copy`. By clicking `Copy` you will copy the job list to the clipboard.
    The job list contains direct links to jobs.

  You can filter or sort jobs by status, as well as by assigner or reviewer.

Follow a link inside `Jobs` section to start annotation process.
In some cases, you can have several links. It depends on size of your
task and `Overlap Size` and `Segment Size` parameters. To improve
UX, only the first chunk of several frames will be loaded and you will be able
to annotate first images. Other frames will be loaded in background.

![](/images/image007_detrac.jpg)
