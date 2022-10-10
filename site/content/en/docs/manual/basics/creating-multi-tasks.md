---
title: 'Creating multi tasks'
linkTitle: 'Creating multi tasks'
weight: 3
description: 'Instructions on how to create and configure multi tasks.'
---

In case when you have a few videos and you don't want to set up CVAT tasks one-by-one manually,
you can use the `multi tasks` option.
> This feature is available for videos only.

Create several tasks pressing `+` button and select `Create multi tasks` on the tasks page or on the project page.

![](/images/image254.jpg)

Specify the task parameters:

- In the `Name` text field, there is a template you can use for quick and simple task naming.

  ![](/images/image255.jpg)

  In the template you can manage the following:
  - some_text - any text that will be entered into the template will be the same for all created tasks.
  - {{index}} - index file in set (sets a number of a task starting from 0).
  - {{file_name}} - name of file (sets a task name from a filename).

  You can find out a prompt by hovering the mouse over the text `When forming the name, a template is used`.

  ![](/images/image256.jpg)


- [Project](/docs/manual/basics/creating_an_annotation_task/#projects), [labels](/docs/manual/basics/creating_an_annotation_task/#labels), [select files](/docs/manual/basics/creating_an_annotation_task/#select-files) and [advanced configuration](/docs/manual/basics/creating_an_annotation_task/#advanced-configuration) are filled in the same way as when [creating an annotation task](/docs/manual/basics/creating_an_annotation_task/).

> It is not possible yet to use cloud storages for multi tasks creation.

![](/images/image257.jpg)

1. Let's specify in the `Name` field the `Road_annotation-{{index}}-{{file_name}}` string,
   where `Road_annotation` is “any text” (let it match to the task type name). The task index number and the video file
   name will be specified after it.
1. After selecting files, file names will be shown under the `Select files` section.
   In case of there are more than 4 files, the total number of selected files will be displayed only.

   ![](/images/image258.jpg)

1. The `Submit` button indicates how many tasks will be created.

After clicking on the `Submit` button, information about tasks creation process will be displayed.

![](/images/image259.jpg)

If there were no errors during the process of creating tasks, we can complete this by clicking on `Ok`.

![](/images/image260.jpg)

This is how the created tasks will look like.

![](/images/image261.jpg)

## Errors

You can face with the following errors during multi tasks creation:

- If where were no video files selected, this warning will be shown.

  ![](/images/image262.jpg)

- If during tasks creation there was not possible to process with some videos,
  the names of such videos will be displayed in the `Failed files` list. In this case, you can try
  to create tasks for these videos one more time by clicking on the `Retry failed tasks` button,
  or you can click on the `Ok` button to skip these videos.

  ![](/images/image263.jpg)
