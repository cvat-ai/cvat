---
title: 'Create annotation task'
linkTitle: 'Create annotation task'
weight: 2
description: 'How to create and configure an annotation task.'
---

To start annotating in CVAT, you need to create an annotation task and specify its parameters.

To create a task, on the **Tasks** or **Projects** page click **+** and
select **Create new task**.

![Create new task](/images/image004.jpg)

See:

- [Basic configuration](#basic-configuration)
  - [Label shape](#label-shape)
  - [Add an attribute](#add-an-attribute)
  - [Select files](#select-files)
  - [RAW](#raw)
  - [Data formats for a 3D task](#data-formats-for-a-3d-task)
- [Advanced configuration](#advanced-configuration)

## Basic configuration

Use basic configuration to create a simple task with minimum parameters.

![Basic configurator](/images/basic_confugurator.jpg)

To create a basic configuration task, do the following:

1. In the **Name** field, enter the name of the new task.

   ![Name of task](/images/image005.jpg)

2. (Optional) From the **Projects** drop-down, select a project for the new task.
   <br>Leave this field empty if you do not want to assign the task to any project.

   ![Select project](/images/image193.jpg)

   > **Note:** Followin steps are valid if the task does not belong to a project.
   > <br>If the task has been assigned to a project, the project's labels will be applied to the task.

3. On the **Constructor** tab, click **Add label**.
   <br>The label constructor menu will open:

   ![Label constructor](/images/image124.jpg)

4. In the **Label name** field, enter the name of the label.
5. (Optional) To limit the use of the label to a certain [shape tool](/docs/manual/basics/controls-sidebar/#shapes),
   from the [**Label shape**](#label-shape) drop-down select the shape.
6. (Optional) Select the color for the label.

   ![label shape and color](/images/label_shape.jpg)

7. (Optional) Click [**Add an attribute**](#add-an-attribute) and set up its properties.
8. Click [**Select files**](#select-files) to upload files for annotation.
9. Click **Continue** to submit the label and start adding a new one
   <br> or **Cancel** to terminate the current label and return you to the labels list.
10. Click **Submit and open** to submit the configuration and open the created task,
    <br>or **Submit and continue**, to submit the configuration and start a new task.

### Label shape

Labels (or classes) are categories of objects that you can annotate.

**Label shape** limits the use of the label to certain [shape tool](/docs/manual/basics/controls-sidebar/#shapes).

`Any`  is the default setting that does not limit the use of the
label to any particular shape tool.

For example, you added:

- Label `sun` with the **Label shape** type `ellipse`
- Lable `car` with the **Label shape** type `any`

As a result:

- The `sun` label will be available only for
  **Draw new ellipse**.
- The `car` label will be available for all shapes.

  ![Label shape](/images/label_shape.gif)

The tools on the [Controls sidebar](/docs/manual/basics/controls-sidebar/)
will be limited to the selected types of shapes.

For example, if you select `Any`,
all tools will be available,
but if you select `Rectangle` for all labels,
only the **Rectangle** tool will be
visible on the sidebar.

> **Note:** You cannot apply the **Label shape**
> to the **AI** and **OpenCV** tools,
> these tools will always be available.

![Type control sidebar](/images/type_tools.png)

You can change the shape of the label as needed.
This change will not affect the existing annotation.

For example, if you created objects using polygons and then changed
the label shape to polylines, all previously created objects will remain
polygons. However, you will not be able to add new polygon
objects with the same label.

> **Note:** You cannot change the shape of the `skeleton` label.
> <br>The **Label shape** field for the `skeleton` label is disabled.

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

To add an attribute, do the following:

1. Go to the **Constructor** tab and click **Add attribute**.

   ![Attributes](/images/attributes_01.png)

2. In the **Name** field enter the name of the attribute.
3. From the drop-down, select way to display the attribute in the **Objects menu**:
   - `Radio` enables the selection of one option from several options.
   - `Checkbox` enables the selection of multiple options.
   - `Text` sets the attribute to a text field.
   - `Number` sets the attribute to numerical field in the following format: `min;max;step`.
4. Set values for the attribute. <br>To separate values use **Enter**.
   <br>To delete value, use **Backspace** or click **x** next to the value name.
5. (Optional) For mutable attributes, select **Mutable**.

To delete an attribute, click **Delete attribute**.

### Select files

There are several ways to upload files:

<!--lint disable maximum-line-length-->

| Data source          | Description                                                                                                                                                                                                                        |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| My computer          | Use this option to select files from your laptop or PC. <br> To select file: <br>1. Click on the **Select files** field: <br>![Select files](/images/select_files.jpg). <br> 2. Select files to upload.                                |
| Connected file share | **Advanced option**. <br>Upload files from a local or cloud shared folder. <br>**Note**, that you need to mount a fileshare first. <br>For more information, see [Share path](/docs/administration/basics/installation/#share-path) |
| Remote source        | **Advanced option**.<br>Enter a list of URLs (one per line) in the field. <br>If you want a `manifest.json` file, select the **Use cache**. <br> For more information, see [Dataset manifest.](/docs/manual/advanced/dataset_manifest/)                    |
| Cloud Storage        | **Advanced option**. <br>To upload files from cloud storage, type the cloud storage name, choose the manifest file, and select the required files. <br> For more information, see [Attach cloud storage](/docs/manual/basics/attach-cloud-storage/)         |

<!--lint enable maximum-line-length-->

### RAW

The **Raw** is a way of working with labels for an advanced user.

> **Note:** Be careful with changing the raw specification of an existing task/project.
> Removing any "id" properties will lead to losing existing annotations.
> **This property will be removed automatically from any text you insert to this field**.

![](/images/image126.jpg)

Raw presents label data in _.json_ format with an option of editing and copying labels as text.
The **Done** button applies the changes and the **Reset** button cancels the changes.

### Data formats for a 3D task

To create a 3D task, you must prepare an archive with one of the following directory structures.

> **Note:** You can't mix 2D and 3D data in the same task.

{{< tabpane >}}
{{< tab header="Velodyne" >}}
VELODYNE FORMAT
Structure:
velodyne_points/
data/
image_01.bin
IMAGE_00 # unknown dirname, # generally image_01.png can be under IMAGE_00, IMAGE_01, IMAGE_02, IMAGE_03, etc
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

## Advanced configuration

Use advanced configuration to set additional parameters for the task
and customize it to meet specific needs or requirements.

![](/images/image128.jpg)

The following parameters are available:

<!--lint disable maximum-line-length-->

| Element              | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Sorting method       | **Note:** Does not work for the video data. <br><br>Several methods to sort the data. <br> For example, the sequence `2.jpeg`, `10.jpeg`, `1.jpeg` after sorting will be: <br><br><li> **Lexicographica**: `1.jpeg`, `10.jpeg`, `2.jpeg` <li> **Natural**: `1.jpeg`, `2.jpeg`, `10.jpeg` <li> **Predefined**: `2.jpeg`, `10.jpeg`, `1.jpeg` <li> **Random** uploads data in random order.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Use zip/video chunks | Use this parameter to speed up the annotation process for videos or image collections. When enabled, the server will divide <br>the video into smaller chunks and send them to the client side in an archive, making it easier to work with the data.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Use cache            | Select checkbox, to enable _on-the-fly_ data processing to reduce task creation time and store data in a cache with a policy of <br>evicting less popular items. <br><br>For more information, see [Data preparation on the fly](/docs/manual/advanced/data_on_fly/).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Image Quality        | Use this parameter to specify the compression level for uploaded images and to improve the speed of loading high-resolution datasets. <br> Values range from `5` (highly compressed images) to `100` (not compressed images).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Overlap Size         | Use this parameter to create overlapped segments, making tracking continuous from one segment to another.<br><br>This parameter has the following options: <br><br><li>**Interpolation task** (video sequence). If you annotate with a bounding box on two adjacent segments, they will be<br> merged into a single bounding box. In case the overlap is zero or the bounding box is inaccurate (not enclosing the object <br>properly, misaligned or distorted) on the adjacent segments, CVAT may have difficulty accurately interpolating the object's <br>movement between the segments. As a result, multiple tracks will be created for the same object. <br><br><li> **Annotation task** (independent images). If an object exists on overlapped segments with overlap greater than zero, <br>and the annotation quality of these segments is done properly, then the object will be automatically merged into a single<br> object. If the overlap is zero or the annotation is inaccurate (not enclosing the object properly, misaligned, distorted) on the<br> adjacent segments, CVAT may have difficulty accurately annotating the object. As a result, multiple bounding boxes will be <br>created for the object. To avoid this, annotate the object on the first segment and the same object on the second segment. <br>If the annotations on different segments (on overlapped frames) are very different, you will have two shapes for the same <br>object. <br>**Note** that this functionality only works for bounding boxes. |
| Segment size         | Use this parameter to divide a dataset into smaller segments. For example, if you want to share a dataset among several<br> annotators, you can divide the dataset into smaller segments and assign each segment to a separate job. This will allow <br>the annotators to work on the data in parallel.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Start frame          | Defines the first frame of the video.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Stop frame           | Defines the last frame of the video.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Frame Step           | Use this parameter to filter video frames or images in a dataset. Specify frame step value to include only <br>certain frames or images in the dataset. <br>For example, if the frame step value is `25`, the dataset will include every 25th frame or image. If a video <br>has `100` frames, setting the frame step to `25` will include only frames `1`, `26`, `51`, `76`, and `100` in the dataset. <br>This can be useful for reducing the size of the dataset, or for focusing on specific frames or images that are <br>of particular interest.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Chunk size           | Defines several frames to be packed in a chunk when send from client to server. <br>The server defines automatically if the chunk is empty. <br>Recommended values: <li> 1080p or less: 36 <li> 2k or less: 8 <li>16 - 4k or less: 4 <li>8 - More: 1 - 4                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Dataset repository   | **Advanced option**. <br>URL link of the repository that specifies the path to the repository for storage (`default: annotation / <dump_file_name> .zip`).<br>Supports _.zip_ and _.xml_ formats. <br><br>Field format: `URL [PATH]` example: `https://github.com/project/repos.git [1/2/3/4/annotation.xml]` <br><br> Supported URL formats: <li>`https://github.com/project/repos[.git]` <li>`github.com/project/repos[.git]` <li>`git@github.com:project/repos[.git]` <br><br> After the task is created, the synchronization status will show up on the task page. <br> If you specify a dataset repository, when you create a task, you will see a message about the need to grant access with <br>the ssh key. <br> This is the key you need to [add to your github account](https://github.com/settings/keys). <br> For other git systems, you can learn about adding an ssh key in their documentation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Use LFS              | **Advanced option**. Use this parameter for big annotation files, to create a repository with [LFS](https://git-lfs.github.com/) support.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Issue tracker        | Optional. Use this parameter to specify the issue tracker's URL.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Source storage       | Specify the source storage for importing resources like annotations and backups. <br>If the task was assigned to the project, use the **Use project source storage** toggle to determine whether to <br>use default values or specify new ones.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Target storage       | Specify the target storage (local or cloud) for exporting resources like annotations and backups. <br>If the task is created in the project, use the **Use project target storage** toggle to determine whether to<br> use default values or specify new ones. <br>To save and open the task click  **Submit & Open** . <br>To create several tasks in sequence,  click on the **Submit & Continue**.<br> Created tasks will be displayed on a [tasks page](/docs/manual/basics/tasks-page/).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

<!--lint enable maximum-line-length-->
