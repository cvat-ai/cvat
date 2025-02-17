---
title: 'Specification for annotators'
linkTitle: 'Specification for annotators'
weight: 16
description: 'Learn how to easily create and add specification for annotators using the Guide feature.'
---

The **Guide** feature provides a built-in markdown editor that
allows you to create specification for annotators.

Once you create and submit the specification,
it will be accessible from the annotation interface (see below).

You can attach the specification to **Projects** or to **Tasks**.

The attachment procedure is the same for individual users and organizations.

See:

- [Adding specification to Project](#adding-specification-to-project)
  - [Editing rights](#editing-rights)
- [Adding specification to Task](#adding-specification-to-task)
  - [Editing rights](#editing-rights-1)
- [Access to specification for annotators](#access-to-specification-for-annotators)
- [Markdown editor guide](#markdown-editor-guide)
- [Specification for annotators' video tutorial](#specification-for-annotators-video-tutorial)

## Adding specification to Project

To add specification to the **Projects**, do the following:

1. Go to the **Projects** page and click on the project to which you want to add specification.
2. Under the **Project description**, click **Edit**.

![Project specification](/images/project_spec.jpg)

3. Add instruction to the [Markdown editor](#markdown-editor-guide), and click **Submit**.

### Editing rights

- **For individual users**: only the project owner and the project assignee can edit the specification.
- **For organizations**: specification additionally can be edited by the organization owner and maintainer

![Editor rights](/images/editor_access_rights_1.jpg)

## Adding specification to Task

To add specification to the **Task**, do the following:

1. Go to the **Tasks** page and click on the task to which you want to add specification.
2. Under the **Task description**, click **Edit**.

   ![Task specification](/images/task_spec.jpg)

3. Add instruction to the [Markdown editor](#markdown-editor-guide), and click **Submit**.

### Editing rights

- **For individual users**: only the task owner and task assignee can edit the specification.
- **For organizations**: only the task owner, maintainer, and task assignee can edit the specification.

![Editor rights](/images/editor_access_rights_2.jpg)

## Access to specification for annotators


The specification is opened automatically when the job has `new annotation` state.
It means, that it will open when the assigned user begins working on the first
job within a **Project** or **Task**.

The specifications will not automatically reopen
if the user moves to another job within the same **Project** or **Task**.

If a **Project** or **Task** is reassigned to another annotator, the specifications will
automatically be shown when the annotator opens the first job but will
not reappear for subsequent jobs.

To enable the option for specifications to always open automatically,
append the `?openGuide` parameter to the end of the job URL you share with the annotator:


```
/tasks/<task_id>/jobs/<job_id>?openGuide
```
For example:

```
https://app.cvat.ai/tasks/taskID/jobs/jobID?openGuide
```

To open specification manually, do the following:

1. Open the job to see the annotation interface.
2. In the top right corner, click **Guide button**(![Guide Icon](/images/guide_icon.jpg)).

## Markdown editor guide

The markdown editor for **Guide** has two panes.
Add instructions to the left pane, and the editor
will immediately show the formatted result on the right.

![Markdown editor](/images/markdown_editor.jpg)

You can write in raw markdown or use the toolbar on the top of the editor.

![Markdown editor](/images/editor_toolbar.jpg)

<!--lint disable maximum-line-length-->

| Element | Description                                                                                                                                                                                                                                                        |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1       | Text formatting: bold, cursive, and strikethrough.                                                                                                                                                                                                                 |
| 2       | Insert a horizontal rule (horizontal line).                                                                                                                                                                                                                        |
| 3       | Add a title, heading, or subheading. It provides a drop-down list to select the title level (from 1 to 6).                                                                                                                                                         |
| 4       | Add a link. <br>**Note:** If you left-click on the link, it will open in the same window.                                                                                                                                                                          |
| 5       | Add a quote.                                                                                                                                                                                                                                                       |
| 6       | Add a single line of code.                                                                                                                                                                                                                                         |
| 7       | Add a block of code.                                                                                                                                                                                                                                               |
| 8       | Add a comment. The comment is only visible to Guide editors and remains invisible to annotators.                                                                                                                                                                   |
| 9       | Add a picture. To use this option, first, upload the picture to an external resource and then add the link in the editor. Alternatively, you can drag and drop a picture into the editor, which will upload it to the CVAT server and add it to the specification. |
| 10      | Add a list: bullet list, numbered list, and checklist.                                                                                                                                                                                                             |
| 11      | Hide the editor pane: options to hide the right pane, show both panes or hide the left pane.                                                                                                                                                                       |
| 12      | Enable full-screen mode.                                                                                                                                                                                                                                           |

<!--lint enable maximum-line-length-->

## Specification for annotators' video tutorial

Video tutorial on how to use the **Guide** feature.

<!--lint disable maximum-line-length-->

<iframe width="560" height="315" src="https://www.youtube.com/embed/hAN9UGRvwOk" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>

<!--lint enable maximum-line-length-->
