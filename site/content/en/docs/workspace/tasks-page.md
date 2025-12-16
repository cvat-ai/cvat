---
title: 'Tasks'
linkTitle: 'Tasks'
weight: 2
description: 'Overview of the Tasks page.'
aliases:
  - /docs/manual/basics/tasks-page/
  - /docs/manual/basics/create-annotation-task/
  - /docs/annotation/tools/delete-frame/
---

## Overview

![Task page example](/images/image006_detrac.jpg)

The **Tasks** page contains elements and each of them relates to a separate task. They are sorted in creation order.
Each element contains: the task name, preview, progress bar, button `Open`, and menu `Actions`.
Each button is responsible for a menu `Actions` specific function:

- `Export task dataset` — download annotations or annotations and images in a specific format.
  More information is available in the {{< ilink "/docs/dataset_management/import-datasets" "export/import datasets" >}}
  section.
- `Upload annotation` upload annotations in a specific format.
  More information is available in the {{< ilink "/docs/dataset_management/import-datasets" "export/import datasets" >}}
  section.
- `Automatic Annotation` — automatic annotation with OpenVINO toolkit.
  Presence depends on how you build the CVAT instance.
- `Backup task` — make a backup of this task into a zip archive.
  Read more in the {{< ilink "/docs/dataset_management/backup" "backup" >}} section.
- `Move to project` — Moving a task to a project (you can move only a task that does not belong to any project).
  In case of a label mismatch, you can create or delete necessary labels in the project/task.
  Some task labels can be matched with the target project labels.
- `Organization` - moving a task between your personal workspace or organizations.
  Only available for individual tasks (not tasks in a project). Please, refer to the
  {{< ilink
  "/docs/account_management/organization#transfer-tasks-and-projects-between-organizations"
  "Transfer between organizations" >}}
  section for details.
- `Delete` — delete task.

In the upper left corner, there is a search bar, using which you can find the task by assignee, task name etc.
In the upper right corner, there are {{< ilink
 "/docs/annotation/manual-annotation/utilities/filter#sort-by" "sorting" >}},
{{< ilink "/docs/annotation/manual-annotation/utilities/filter#quick-filters" "quick filters" >}}, and filter.

### Filter

{{% alert title="Note" color="primary" %}}
Applying a filter disables the {{< ilink
 "/docs/annotation/manual-annotation/utilities/filter#quick-filters" "quick filter" >}}.
{{% /alert %}}

The filter works similarly to the filters for annotation,
you can create rules from [properties](#supported-properties-for-tasks-list),
{{< ilink "/docs/annotation/manual-annotation/utilities/filter#supported-operators-for-properties" "operators" >}},
and values and group rules into {{< ilink "/docs/annotation/manual-annotation/utilities/filter#groups" "groups" >}}.
For more details, consult the {{< ilink
 "/docs/annotation/manual-annotation/utilities/filter#create-a-filter" "filter section" >}}.
Learn more about {{< ilink
 "/docs/annotation/manual-annotation/utilities/filter#date-and-time-selection" "date and time selection" >}}.

For clear all filters press `Clear filters`.

### Supported properties for tasks list

| Properties     | Supported values                             | Description                                 |
| -------------- | -------------------------------------------- | ------------------------------------------- |
| `Dimension`    | `2D` or `3D`                                 | Depends on the data format <br>(read more in {{< ilink "/docs/workspace/tasks-page#create-annotation-task" "creating an annotation task" >}}) |
| `Status`       | `annotation`, `validation` or `completed`    |                                             |
| `Data`         | `video`, `images`                            | Depends on the data format <br>(read more in {{< ilink "/docs/workspace/tasks-page#create-annotation-task" "creating an annotation task" >}}) |
| `Subset`       | `test`, `train`, `validation` or custom subset | {{< ilink "/docs/getting_started/vocabulary#subset" "learn more" >}} |
| `Assignee`     | username                                     | Assignee is the user who is working on the project, task or job <br>(they are specified on task page) |
| `Owner`        | username                                     | The user who owns the project, task, or job |
| `Last updated` | last modified date and time (or value range) | The date can be entered in the `dd.MM.yyyy HH:mm` format <br>or by selecting the date in the window that appears <br>when you click on the input field |
| `ID`           | number or range of job ID                    |                                             |
| `Project ID`   | number or range of project ID                |                                             |
| `Name`         | name                                         | On the tasks page: name of the task,<br> on the project page: name of the project |
| `Project name` | project name                                 | Specified when creating a project, <br>can be changed on the ({{< ilink "/docs/workspace/projects" "project section" >}}) |

---

Select `Open` to go to {{< ilink "/docs/workspace/tasks-page#task-details-page" "task details" >}}.

## Task details page

Task details is a task page that contains a preview, a progress bar,
the details of the task (specified when the task was created), and the **Jobs** section.

![Task details page example](/images/task-details-1.png)

The next actions are available on this page:
1. Change the task’s title.
1. Open `Actions` menu.
1. Change the issue tracker or open it if specified.
1. Change labels (available only if the task is not related to the project).

   You can add new labels or add attributes for the existing labels in the Raw mode or the Constructor mode.
   By selecting `Copy` you will copy the labels to the clipboard.

1. **Assigned to** — is used to assign a task to a person. Start typing an assignee’s name and/or
    choose the right person out of the dropdown list.
    In the list of users, you will only see the users of the
    {{< ilink "/docs/account_management/organization" "organization" >}}
    where the task is created.
1. **Cloud storage** — view the cloud storage attached to the task and change it to another attached storage if needed.

**Jobs** is a list of all jobs for a particular task. Here you can find the next data:
- Jobs name with a hyperlink to it.
- Frame range — the frame interval.
- A stage of the job. The stage is specified by a drop-down list.
  There are three stages: `annotation`, `validation`, or `acceptance`. This value affects the task progress bar.
- A state of the job. The state can be changed by an assigned user in the menu inside the job.
  There are several possible states: `new`, `in progress`, `rejected`, `completed`.
- Duration — is the amount of time the job is being worked.
- Assignee is the user who is working on the job (annotator,
  {{< ilink "/docs/qa-analytics/manual-qa" "reviewer, or corrector" >}}).
  You can start typing an assignee’s name and/or choose the right person out of the dropdown list.

You can filter or sort jobs by status, assignee, and updated date using the filters panel.

Follow a link inside **Jobs** section to start the annotation process.
In some cases, you can have several links. It depends on the size of your
task and **Overlap Size** and **Segment Size** parameters. To improve
UX, only the first chunk of several frames will be loaded and you will be able
to annotate the first images. Other frames will be loaded in the background.

![Example of user interface with task frames](/images/task-details-2.png)

## How to create and configure an annotation task

To start annotating in CVAT, you must create an annotation task and specify its parameters.

### Create a task

To create a task:
1. On the **Tasks** page, select **+**
1. Select **Create new task**.

  ![Create new task](/images/image004.jpg)

Next, specify the task parameters in the configurator:

![Basic configurator](/images/basic_confugurator.jpg)

1. In the **Name** field, enter the name of the new task.

   ![Name of task](/images/image005.jpg)

1. (Optional) From the **Projects** drop-down, select a project for the new task.
   <br>Leave this field empty if you do not want to assign the task to any project.

   <!-- TODO: replace the image with '/images/select_project.png' after updating screenshots -->
   ![Select project](/images/image193.jpg)

   {{% alert title="Note" color="primary" %}}
   Following steps are valid if the task does not belong to a project.
   <br>If the task has been assigned to a project, the project's labels will be applied to the task.
   {{% /alert %}}

1. On the **Constructor** tab, select **Add label**.
   <br>The label constructor menu will open:

   ![Label constructor](/images/image124.jpg)

1. In the **Label name** field, enter the name of the label.
1. (Optional) To limit the use of the label to a certain
   {{< ilink "/docs/annotation/annotation-editor/controls-sidebar#shapes" "shape tool" >}},
   from the [**Label shape**](#label-shape) drop-down select the shape.
1. (Optional) Select the color for the label.

   ![label shape and color](/images/label_shape.jpg)

1. (Optional) Select [**Add an attribute**](#add-an-attribute) and set up its properties.
1. Select [**Select files**](#select-files) to upload files for annotation.
1. Select **Continue** to submit the label and start adding a new one
   <br> or **Cancel** to terminate the current label and return you to the labels list.
1. Select **Submit and open** to submit the configuration and open the created task,
    <br>or **Submit and continue**, to submit the configuration and start a new task.

### Label shape

Labels (or classes) are categories of objects that you can annotate.

**Label shape** limits the use of the label to certain
{{< ilink "/docs/annotation/annotation-editor/controls-sidebar#shapes" "shape tool" >}}.

`Any` is the default setting that does not limit the use of the
label to any particular shape tool.

For example, if you added:

- Label `sun` with the **Label shape** type `ellipse`
- Label `car` with the **Label shape** type `any`

As a result:

- The `sun` label will be available only for ellipse shape.
- The `car` label will be available for all shapes.

  ![Label shape](/images/label_shape.gif)

The tools on the {{< ilink "/docs/annotation/annotation-editor/controls-sidebar" "Controls sidebar" >}}
will be limited to the selected types of shapes.


For example, if you select `Any`,
all tools will be available,
but if you select `Rectangle` for all labels,
only the **Rectangle** tool will be
visible on the sidebar.

{{% alert title="Note" color="primary" %}}
You cannot apply the **Label shape**
to the **AI** and **OpenCV** tools,
these tools will always be available.
{{% /alert %}}

![Type control sidebar](/images/type_tools.png)

You can change the shape of the label as needed.
This change will not affect the existing annotation.

For example, if you created objects using polygons and then changed
the label shape to polylines, all previously created objects will remain
polygons. However, you will not be able to add new polygon
objects with the same label.

{{% alert title="Note" color="primary" %}}
You cannot change the shape of the `skeleton` label.
<br>The **Label shape** field for the `skeleton` label is disabled.
{{% /alert %}}

### Add an attribute

**Attribute** is a property of an annotated object,
such as color, model, or other quality.

For example, you have a label for `face` and want to
specify the type of face. Instead of creating additional
labels for `male` and `female`, you can use attributes
to add this information.

There are two types of attributes:

- **Immutable** attributes are unique and do not change from frame to frame.
  For example, `age`, `gender`, and `color`.
- **Mutable** attributes are temporary and can change from frame to frame.
  For example, `pose`, `quality`, and `truncated`.

Added attributes will be available from the **Objects menu**:

![Attributes](/images/attributes.jpg)

To add an attribute:

1. Go to the **Constructor** tab and select **Add attribute**.

   ![Attributes](/images/attributes_01.png)

1. In the **Name** field, enter the attribute name.
1. In the drop-down menu, select the way to display the attribute in the **Objects menu**:

   - `Select` enables a drop-down list, from which you can select an attribute. <br>If in
     the **Attribute value** field you add `__undefined__`,
     the drop-down list will have a blank value.<br>
     This is useful for cases where the attribute of the object cannot be clarified:

     ![Undefined value](/images/undefined_value.jpg)

   - `Radio` enables the selection of one option from several options.
   - `Checkbox` enables the selection of multiple options.
   - `Text` sets the attribute to a text field.
   - `Number` sets the attribute to numerical field in the following format: `min;max;step`.

1. In the **Attribute values** field, add attribute values. <br>To separate values use **Enter**.
   <br>To delete value, use **Backspace** or click **x** next to the value name.
1. (Optional) For mutable attributes, select **Mutable**.
1. (Optional) To set an attribute value as default, select it.
   The default value will change color to blue.

![Default attribute](/images/default_attribute.jpg)

To delete an attribute, select **Delete attribute**.

### Select files

There are several ways to upload files:

| Data source          | Description                                                                                                                                                                                                                                                                                                                                           |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| My computer          | Use this option to select files from your laptop or PC. <br> To select file: <br>1. Select **Select files** field: <br>![Select files](/images/select_files.jpg). <br> 2. Select files to upload.                                                                                                                                               |
| Connected file share | **Advanced option**. <br>Upload files from a local or cloud shared folder. <br>**Note**, that you need to mount a fileshare first. <br>For more information, consult {{< ilink "/docs/administration/community/basics/installation#share-path" "Share path" >}}                                                                                   |
| Remote source        | Enter a list of URLs (one per line) in the field.                                                                                                                                                                                                                                                                                                     |
| Cloud Storage        | **Advanced option**. <br>To upload files from cloud storage, type the cloud storage name, (optional) choose the manifest file, and select the required files. <br> For more information, consult {{< ilink "/docs/workspace/attach-cloud-storage" "Attach cloud storage" >}}. Use the search feature to find a file (by file name) from the connected cloud storage. |

### Editing labels in RAW format

The **Raw** is a way of working with labels for an advanced user.

It is useful when you need to copy labels from one independent task to another.

{{% alert title="Note" color="primary" %}}
Be careful with changing the raw specification of an existing task/project.
Removing any "id" properties will lead to losing existing annotations.
**This property will be removed automatically from any text you insert to this field**.
{{% /alert %}}

!["Raw" tab in task creation window showing labels in JSON format](/images/image126.jpg)

Raw presents label data in _.json_ format with an option of editing and copying labels as text.
The **Done** button applies the changes and the **Reset** button cancels the changes.

### Data formats for a 3D task

To create a 3D task, you must prepare an archive with one of the following directory structures.

{{% alert title="Note" color="primary" %}}
You can't mix 2D and 3D data in the same task.
{{% /alert %}}

{{< tabpane >}}
{{< tab header="Velodyne" >}}
  VELODYNE FORMAT
    Structure:
      velodyne_points/
        data/
          image_01.bin
          IMAGE_00 # unknown dirname,
                   # generally image_01.png can be under IMAGE_00, IMAGE_01, IMAGE_02, IMAGE_03, etc
      data/
        image_01.png
{{< /tab >}}
{{< tab header="3D pointcloud" >}}
   3D POINTCLOUD DATA FORMAT
    Structure:
      pointcloud/
        00001.pcd
      related_images/
        00001_pcd/
          image_01.png # or any other image

{{< /tab >}}
{{< tab header="3D Option 1" >}}
    3D, DEFAULT DATAFORMAT Option 1
    Structure:
      data/
        image.pcd
        image.png

{{< /tab >}}
{{< tab header="3D Option 2" >}}
    3D, DEFAULT DATAFORMAT Option 2
    Structure:
      data/
        image_1/
            image_1.pcd
            context_1.png # or any other name
            context_2.jpg


{{< /tab >}}
{{< /tabpane >}}

### Advanced configuration

Use advanced configuration to set additional parameters for the task
and customize it to meet specific needs or requirements.

![Advanced configuration section opened in task creation window](/images/image128.jpg)

The following parameters are available:

| Element           | Description |
| ----------------- | ----------- |
| Sorting method    | **Note:** Does not work for the video data. <br><br>Several methods to sort the data. <br> For example, the sequence `2.jpeg`, `10.jpeg`, `1.jpeg` after sorting will be: <br><br><li> **Lexicographical**: `1.jpeg`, `10.jpeg`, `2.jpeg` <li> **Natural**: `1.jpeg`, `2.jpeg`, `10.jpeg` <li> **Predefined**: `2.jpeg`, `10.jpeg`, `1.jpeg` <li> **Random** uploads data in random order. |
| Prefer zip chunks | Use this parameter to divide your video or image dataset for annotation into short video clips a zip file of frames. <br>Zip files are larger but do not require decoding on the client side, and video clips are smaller but require decoding. <br>It is recommended to turn off this parameter for video tasks to reduce traffic between the client side and the server. |
| Use cache         | Select the checkbox to enable _on-the-fly_ data processing to reduce task creation time and store data in a cache with a policy of <br>evicting less popular items. <br><br>For more information, see {{< ilink "/docs/dataset_management/data-on-fly" "Data preparation on the fly" >}}. |
| Image quality     | CVAT has two types of data: original quality and compressed. Original quality images are used for dataset export<br> and automatic annotation. Compressed images are used only for annotations to reduce traffic between the server <br>and client side. <br> It is recommended to adjust the compression level only if the images contain small objects that are not <br>visible in the original quality. <br> Values range from `5` (highly compressed images) to `100` (not compressed). |
| Overlap size      | Use this parameter to create overlapped segments, making tracking continuous from one segment to another. <br><br>**Note** that this functionality only works for bounding boxes. <br><br>This parameter has the following options: <br><br>**Interpolation task** (video sequence). If you annotate with a bounding box on two adjacent segments, they will be<br> merged into a single bounding box. In case the overlap is zero or the bounding box is inaccurate (not enclosing the object <br>properly, misaligned or distorted) on the adjacent segments, it may be difficult to accurately interpolate the object's <br>movement between the segments. As a result, multiple tracks will be created for the same object. <br><br>**Annotation task** (independent images). If an object exists on overlapped segments with overlap greater than zero, <br>and the annotation of these segments is done properly, then the segments will be automatically merged into a single<br> object. If the overlap is zero or the annotation is inaccurate (not enclosing the object properly, misaligned, distorted) on the<br> adjacent segments, it may be difficult to accurately track the object. As a result, multiple bounding boxes will be <br>created for the same object. <br><br>If the annotations on different segments (on overlapped frames) are very different, you will have two shapes <br>for the same object. <br><br>To avoid this, accurately annotate the object on the first segment and the same object on the second segment to create a track <br>between two annotations. |
| Segment size      | Use this parameter to divide a dataset into smaller parts. For example, if you want to share a dataset among multiple<br> annotators, you can split it into smaller sections and assign each section to a separate job. <br>This allows annotators to work on the same dataset concurrently. |
| Start frame       | Defines the first frame of the video. |
| Stop frame        | Defines the last frame of the video. |
| Frame step        | Use this parameter to filter video frames or images in a dataset. Specify frame step value to include only <br>certain frames or images in the dataset. <br>For example, if the frame step value is `25`, the dataset will include every 25th frame or image. If a video <br>has `100` frames, setting the frame step to `25` will include only frames `1`, `26`, `51`, `76`, and `100` in the dataset. <br>This can be useful for reducing the size of the dataset, or for focusing on specific frames or images<br>of particular interest. |
| Chunk size        | Defines amount of frames to be packed in a chunk when send from client to server. <br>The server defines automatically if the chunk is empty. <br>Recommended values: <li> 1080p or less: 36 <li> 2k or less: 8 <li>16 - 4k or less: 4 <li>8 - More: 1 - 4 |
| Issue tracker     | Use this parameter to specify the issue tracker URL. |
| Source storage    | Specify the source storage for importing resources like annotations and backups. <br>If the task was assigned to the project, use the **Use project source storage** toggle to determine whether to <br>use project values or specify new ones. |
| Target storage    | Specify the target storage (local or cloud) for exporting resources like annotations and backups. <br>If the task is created in the project, use the **Use project target storage** toggle to determine whether to<br> use project values or specify new ones. |

To save and open the task, select **Submit & Open** .

To create several tasks in sequence, select **Submit & Continue**.

Created tasks will be displayed on the {{< ilink "/docs/workspace/tasks-page" "tasks page" >}}.

## How to create and set up multiple tasks

Use **Create multi tasks** to create multiple video annotation tasks with the same configuration.

{{% alert title="Note" color="primary" %}}
The **Create multi tasks** feature is available for videos only.
{{% /alert %}}

Check out:

- [Create multi tasks](#create-multi-tasks)
- [Example](#example)
- [Errors](#errors)
- [Advanced configuration](#advanced-configuration)

### Create multi tasks

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
   {{< ilink "/docs/workspace/tasks-page#create-annotation-task#add-an-attribute" "**Add an attribute**" >}}
   and set up its properties.
1. Select {{< ilink "/docs/workspace/tasks-page#create-annotation-task#select-files" "**Select files**" >}}
   to upload files for annotation.

   {{% alert title="Note" color="primary" %}}
   You cannot upload multiple tasks from the cloud storage.
   {{% /alert %}}

1. Select **Submit `N` tasks**

### Example

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

### Errors

During the process of adding multiple tasks, the following errors may occur:

| Error                     | Description                                                                                                                                                                                                                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ![Wrong file format error in user interface](/images/create_multi_tasks_8.png) | Wrong file format. You can add only video files.                                                                                                                                                                                                                                                 |
| ![Failed to process file error in user interface](/images/create_multi_tasks_9.png) | In the process of creating a task, CVAT was not able to process the video file. <br>The name of the failed file will be displayed on the progress bar. <br><br> To fix this issue: <li> If you want to try again, click **Retry failed tasks**. <li> If you want to skip the file, click **OK**. |

### Advanced configuration

Use advanced configuration to set additional parameters for the task
and customize it to meet specific needs or requirements.

For more information, consult
{{< ilink "/docs/workspace/tasks-page#advanced-configuration" "Advanced configuration" >}}

## How to delete a frame from a task

You can delete the current frame from a task.
This frame will not be presented either in the UI or in the exported annotation.
Thus, it is possible to mark corrupted frames that are not subject to annotation.

1. Go to the Job annotation view and click on the **Delete frame** button (**Alt**+**Del**).

   {{% alert title="Note" color="primary" %}}
   When you delete with the shortcut,
   the frame will be deleted immediately without additional confirmation.
   {{% /alert %}}

   ![Part of annotation interface with highlighted "Delete frame" button](/images/image245.jpg)

1. After that you will be asked to confirm frame deleting.

   {{% alert title="Note" color="primary" %}}
   all annotations from that frame will be deleted, unsaved annotations
   will be saved and the frame will be invisible in the annotation view (Until you make it visible in the settings).
   If there is some overlap in the task and the deleted frame falls within this interval,
   then this will cause this frame to become unavailable in another job as well.
   {{% /alert %}}

1. When you delete a frame in a job with tracks, you may need to adjust some tracks manually. Common adjustments are:
   - Add keyframes at the edges of the deleted interval for the interpolation to look correct;
   - Move the keyframe start or end keyframe to the correct side of the deleted interval.

## Configure deleted frames visibility and navigation

If you need to enable showing the deleted frames, you can do it in the settings.

1. Go to the settings and chose **Player** settings.

   !["Player" tab opened in "Settings" with highlighted "Show deleted frames" option](/images/image246.jpg)

1. Click on the **Show deleted frames** checkbox. And close the settings dialog.

   ![Example of a deleted frame appearance with "Show deleted frames" option enabled](/images/image247.jpg)

1. Then you will be able to navigate through deleted frames.
   But annotation tools will be unavailable. Deleted frames differ in the corresponding overlay.

1. There are ways to navigate through deleted frames without enabling this option:

   - Go to the frame via direct navigation methods: navigation slider or frame input field,
   - Go to the frame via the direct link, for example: `/api/tasks/{id}/jobs/{id}?frame={frame_id}`.

1. Navigation with step will not count deleted frames.

## Restore deleted frame

You can also restore deleted frames in the task.

1. Turn on deleted frames visibility, as it was told in the previous part,
   and go to the deleted frame you want to restore.

   ![Part of annotation interface with highlighted "Restore frame" button](/images/image248.jpg)

1. Click on the **Restore** icon. The frame will be restored immediately.
