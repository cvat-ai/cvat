---
title: 'Create multi tasks'
linkTitle: 'Create multi tasks'
weight: 3
description: 'Step-by-step guide on how to create and set up multiple tasks'
---

Use **Create multi tasks** to create multiple video annotation tasks with the same configuration.

To create the multi tasks, on the **Tasks** page click **+** and
select **Create multi tasks**.

> **Note:** The **Create multi tasks** feature is available for videos only.

![](/images/create_multi_tasks_1.png)

See:

- [Create multi tasks](#create-multi-tasks)
- [Example](#example)
- [Errors](#errors)
- [Advanced configuration](#advanced-configuration)

## Create multi tasks

To add several tasks in one go, open the task configurator:

![Multitack configurator](/images/create_multi_tasks_2.png)

And specify the following parameters:

1. In the **Name** field, enter the name of the new task:

   - Enter the name of the task
   - (Optional) `{{index}}` adds an index to the file in the set (starting from 0).
   - (Optional) `{{file_name}}` adds the file's name to the task's name.

2. (Optional) From the **Projects** drop-down, select a project for the tasks.
   <br>Leave this field empty if you do not want to assign tasks to any project.

   ![Select project](/images/select_project.png)

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
   ![](/images/create_multi_tasks_3.png)
4. Click **Submit `N` tasks**

   ![](/images/create_multi_tasks_4.png)

5. You will see a progress bar that shows the progress of the tasks being created:

   ![](/images/create_multi_tasks_5.png)

6. Click **Ok**.

   ![](/images/create_multi_tasks_6.png)

The result will look like the following:

![](/images/create_multi_tasks_7.png)

## Errors

During the process of adding multiple tasks, the following errors may occur:

<!--lint disable maximum-line-length-->

| Error                     | Description                                                                                                                                                                                                                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ![](/images/create_multi_tasks_8.png) | Wrong file format. You can add only video files.                                                                                                                                                                                                                                                 |
| ![](/images/create_multi_tasks_9.png) | In the process of creating a task, CVAT was not able to process the video file. <br>The name of the failed file will be displayed on the progress bar. <br><br> To fix this issue: <li> If you want to try again, click **Retry failed tasks**. <li> If you want to skip the file, click **OK**. |

<!--lint enable maximum-line-length-->

## Advanced configuration

Use advanced configuration to set additional parameters for the task
and customize it to meet specific needs or requirements.

For more information, see
{{< ilink "/docs/manual/basics/create_an_annotation_task#advanced-configuration" "Advanced configuration" >}}
