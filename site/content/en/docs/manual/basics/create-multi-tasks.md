---
title: 'Create multi tasks'
linkTitle: 'Create multi tasks'
weight: 3
description: 'Step-by-step guide on how to create and set up multiple tasks'
---

Use **Create multi tasks** to create multiple video annotation tasks with the same configuration.

> The **Сreate multi tasks** feature is available for videos only.

To create the multi tasks, on the **Tasks** page click **+** and
select **Create multi tasks**.

![](/images/image254.jpg)

See:

- [Create multi tasks](#create-multi-tasks)
- [Example](#example)
- [Errors](#errors)
- [Advanced configuration](#advanced-configuration)

## Create multi tasks

To add several tasks in one go, open the task configurator:

![Multitack configurator](/images/multitask_configurator.png)

And specify the following parameters:

1. In the **Name** field, enter the name of the new task:

   - Enter the name of the task. If the name includes more than one word, use the underscore: `Word1 word2 word3`
   - (Optional) `{{index}}` adds an index to the file in the set (starting from 0).
   - (Optional) `{{file_name}}` adds the file's name to the task's name.
     > **Note:** use hyphen between three parameters: `Word1 word2 word3 {{index}} {{file_name}}`

2. (Optional) From the **Projects** drop-down, select a project for the tasks.
   <br>Leave this field empty if you do not want to assign tasks to any project.

   ![Select project](/images/image193.jpg)

   > **Note:** Following steps are valid if the tasks do not belong to a project.
   > <br>If the tasks have been assigned to a project, the project's labels will be applied to the tasks.

3. On the **Constructor** tab, click **Add label**.
4. In the **Label name** field, enter the name of the label.
5. (Optional) Select the color for the label.
6. (Optional) Click
   {{< ilink "/docs/manual/basics/create_an_annotation_task#add-an-attribute" "**Add an attribute**" >}}
   and set up its properties.
7. Click {{< ilink "/docs/manual/basics/create_an_annotation_task#select-files" "**Select files**" >}}
   to upload files for annotation.
   > **Note:** You cannot upload multiple tasks from the cloud storage.
8. Click **Submit `N` tasks**

## Example

A step-by-step example for creating the multiple tasks:

1. In the **Name** field, enter the `Create_multitask-{{index}}-{{file_name}}`.
2. Add labels.
3. Select files. <br>In case there are more than four files,
   only the total number of selected files will be displayed:
   ![](/images/image258.jpg)
4. Click **Submit `N` tasks**

   ![](/images/image257.jpg)

5. You will see a progress bar that shows the progress of the tasks being created:

   ![](/images/image259.jpg)

6. Click **Ok**.

   ![](/images/image260.jpg)

The result will look like the following:

![](/images/image261.jpg)

## Errors

During the process of adding multiple tasks, the following errors may occur:

<!--lint disable maximum-line-length-->

| Error                     | Description                                                                                                                                                                                                                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ![](/images/image262.jpg) | Wrong file format. You can add only video files.                                                                                                                                                                                                                                                 |
| ![](/images/image263.jpg) | In the process of creating a task, CVAT was not able to process the video file. <br>The name of the failed file will be displayed on the progress bar. <br><br> To fix this issue: <li> If you want to try again, click **Retry failed tasks**. <li> If you want to skip the file, click **OK**. |

<!--lint enable maximum-line-length-->

## Advanced configuration

Use advanced configuration to set additional parameters for the task
and customize it to meet specific needs or requirements.

For more information, see
{{< ilink "/docs/manual/basics/create_an_annotation_task#advanced-configuration" "Advanced configuration" >}}
