---
title: 'Create multi tasks'
linkTitle: 'Create multi tasks'
weight: 3
description: 'Step-by-step guide on how to create and set up multiple tasks'
---

Use **Create multi tasks** to create multiple video annotation tasks with the same configuration.

{{% alert title="Note" color="primary" %}}
The **Create multi tasks** feature is available for videos only.
{{% /alert %}}

Check out:

- [Create multi tasks](#create-multi-tasks)
- [Example](#example)
- [Errors](#errors)
- [Advanced configuration](#advanced-configuration)

## Create multi tasks

To create the multi tasks:
1. On the **Tasks** page select **+**.
1. Select **Create multi tasks**.

![User interface with opened menu and highlighted "Create multi tasks" option](/images/create_multi_tasks_1.png)

Next, specify the parameters in the task configurator:

![Multitack configurator](/images/create_multi_tasks_2.png)

1. In the **Name** field, enter the name of the new task:

   - Enter the name of the task
   - (Optional) `{{index}}` adds an index to the file in the set (starting from 0).
   - (Optional) `{{file_name}}` adds the file's name to the task's name.

1. (Optional) From the **Projects** drop-down, select a project for the tasks.
   <br>Leave this field empty if you do not want to assign tasks to any project.

   ![Select project](/images/select_project.png)

   {{% alert title="Note" color="primary" %}}
   Following steps are valid if the tasks do not belong to a project.
   <br>If the tasks have been assigned to a project, the project's labels will be applied to the tasks.
   {{% /alert %}}

1. On the **Constructor** tab, select **Add label**.
1. In the **Label name** field, enter the name of the label.
1. (Optional) Select the color for the label.
1. (Optional) Select
   {{< ilink "/docs/manual/basics/create-annotation-task#add-an-attribute" "**Add an attribute**" >}}
   and set up its properties.
1. Select {{< ilink "/docs/manual/basics/create-annotation-task#select-files" "**Select files**" >}}
   to upload files for annotation.

   {{% alert title="Note" color="primary" %}}
   You cannot upload multiple tasks from the cloud storage.
   {{% /alert %}}

1. Select **Submit `N` tasks**

## Example

A step-by-step example for creating the multiple tasks:

1. In the **Name** field, enter the `Create_multitask-{{index}}-{{file_name}}`.
1. Add labels.
1. Select files. <br>In case there are more than four files,
   only the total number of selected files will be displayed:
   !["My computer" tab opened in task creation window with message showing the number of selected files](/images/create_multi_tasks_3.png)
1. Select **Submit `N` tasks**

   !["Basic configuration" tab opened in task creation window](/images/create_multi_tasks_4.png)

1. You will see a progress bar that shows the progress of the tasks being created:

   ![Progress bar demonstrating the status of multi tasks creation](/images/create_multi_tasks_5.png)

1. Select **Ok**.

   ![Progress bar after finishing multi tasks creation](/images/create_multi_tasks_6.png)

The result will look like the following:

![Example of created multi tasks in the task list](/images/create_multi_tasks_7.png)

## Errors

During the process of adding multiple tasks, the following errors may occur:

<!--lint disable maximum-line-length-->

| Error                     | Description                                                                                                                                                                                                                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ![Wrong file format error in user interface](/images/create_multi_tasks_8.png) | Wrong file format. You can add only video files.                                                                                                                                                                                                                                                 |
| ![Failed to process file error in user interface](/images/create_multi_tasks_9.png) | In the process of creating a task, CVAT was not able to process the video file. <br>The name of the failed file will be displayed on the progress bar. <br><br> To fix this issue: <li> If you want to try again, click **Retry failed tasks**. <li> If you want to skip the file, click **OK**. |

<!--lint enable maximum-line-length-->

## Advanced configuration

Use advanced configuration to set additional parameters for the task
and customize it to meet specific needs or requirements.

For more information, consult
{{< ilink "/docs/manual/basics/create-annotation-task#advanced-configuration" "Advanced configuration" >}}
