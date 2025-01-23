---
title: 'Create annotation task'
linkTitle: 'Create annotation task'
weight: 2
description: 'How to create and configure an annotation task.'
---

To start annotating in CVAT, you need to create an annotation task and specify its parameters.

To create a task, on the **Tasks** page click **+** and
select **Create new task**.

![Create new task](/images/image004.jpg)

See:

- [Create a task](#create-a-task)
  - [Label shape](#label-shape)
  - [Add an attribute](#add-an-attribute)
  - [Select files](#select-files)
  - [Editing labels in RAW format](#editing-labels-in-raw-format)
  - [Data formats for a 3D task](#data-formats-for-a-3d-task)
- [Advanced configuration](#advanced-configuration)

## Create a task

To create a new task, open task configurator:

![Basic configurator](/images/basic_confugurator.jpg)

And specify the following parameters:

1. In the **Name** field, enter the name of the new task.

   ![Name of task](/images/image005.jpg)

2. (Optional) From the **Projects** drop-down, select a project for the new task.
   <br>Leave this field empty if you do not want to assign the task to any project.

   <!-- TODO: replace the image with '/images/select_project.png' after updating screenshots -->
   ![Select project](/images/image193.jpg)

   > **Note:** Following steps are valid if the task does not belong to a project.
   > <br>If the task has been assigned to a project, the project's labels will be applied to the task.

3. On the **Constructor** tab, click **Add label**.
   <br>The label constructor menu will open:

   ![Label constructor](/images/image124.jpg)

4. In the **Label name** field, enter the name of the label.
5. (Optional) To limit the use of the label to a certain
   {{< ilink "/docs/manual/basics/CVAT-annotation-Interface/controls-sidebar#shapes" "shape tool" >}},
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

**Label shape** limits the use of the label to certain
{{< ilink "/docs/manual/basics/CVAT-annotation-Interface/controls-sidebar#shapes" "shape tool" >}}.

`Any` is the default setting that does not limit the use of the
label to any particular shape tool.

For example, you added:

- Label `sun` with the **Label shape** type `ellipse`
- Label `car` with the **Label shape** type `any`

As a result:

- The `sun` label will be available only for ellipse shape.
- The `car` label will be available for all shapes.

  ![Label shape](/images/label_shape.gif)

The tools on the {{< ilink "/docs/manual/basics/CVAT-annotation-Interface/controls-sidebar" "Controls sidebar" >}}
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

   - `Select` enables a drop-down list, from which you can select an attribute. <br>If in
     the **Attribute value** field you add `__undefined__`,
     the drop-down list will have a blank value.<br>
     This is useful for cases where the attribute of the object cannot be clarified:

   - ![Undefined value](/images/undefined_value.jpg)

   - `Radio` enables the selection of one option from several options.
   - `Checkbox` enables the selection of multiple options.
   - `Text` sets the attribute to a text field.
   - `Number` sets the attribute to numerical field in the following format: `min;max;step`.

4. In the **Attribute values** field, add attribute values. <br>To separate values use **Enter**.
   <br>To delete value, use **Backspace** or click **x** next to the value name.
5. (Optional) For mutable attributes, select **Mutable**.
6. (Optional) To set the default attribute, hover over it with mouse cursor and
   click on it. The default attribute will change color to blue.

![Default attribute](/images/default_attribute.jpg)

To delete an attribute, click **Delete attribute**.

### Select files

There are several ways to upload files:

<!--lint disable maximum-line-length-->

| Data source          | Description                                                                                                                                                                                                                                                                                                                                           |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| My computer          | Use this option to select files from your laptop or PC. <br> To select file: <br>1. Click on the **Select files** field: <br>![Select files](/images/select_files.jpg). <br> 2. Select files to upload.                                                                                                                                               |
| Connected file share | **Advanced option**. <br>Upload files from a local or cloud shared folder. <br>**Note**, that you need to mount a fileshare first. <br>For more information, see {{< ilink "/docs/administration/basics/installation#share-path" "Share path" >}}                                                                                                                   |
| Remote source        | Enter a list of URLs (one per line) in the field.                                                                                                                                                                                                                                                                                                     |
| Cloud Storage        | **Advanced option**. <br>To upload files from cloud storage, type the cloud storage name, (optional) choose the manifest file, and select the required files. <br> For more information, see {{< ilink "/docs/manual/basics/attach-cloud-storage" "Attach cloud storage" >}}. Use the search feature to find a file (by file name) from the connected cloud storage. |

<!--lint enable maximum-line-length-->

### Editing labels in RAW format

The **Raw** is a way of working with labels for an advanced user.

It is useful when you need to copy labels from one independent task to another.

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

## Advanced configuration

Use advanced configuration to set additional parameters for the task
and customize it to meet specific needs or requirements.

![](/images/image128.jpg)

The following parameters are available:

<!--lint disable maximum-line-length-->

| Element              | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sorting method       | **Note:** Does not work for the video data. <br><br>Several methods to sort the data. <br> For example, the sequence `2.jpeg`, `10.jpeg`, `1.jpeg` after sorting will be: <br><br><li> **Lexicographica**: `1.jpeg`, `10.jpeg`, `2.jpeg` <li> **Natural**: `1.jpeg`, `2.jpeg`, `10.jpeg` <li> **Predefined**: `2.jpeg`, `10.jpeg`, `1.jpeg` <li> **Random** uploads data in random order.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Use zip/video chunks | Use this parameter to divide your video or image dataset for annotation into short video clips a zip file of frames. <br>Zip files are larger but do not require decoding on the client side, and video clips are smaller but require decoding. <br>It is recommended to turn off this parameter for video tasks to reduce traffic between the client side and the server.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Use cache            | Select checkbox, to enable _on-the-fly_ data processing to reduce task creation time and store data in a cache with a policy of <br>evicting less popular items. <br><br>For more information, see {{< ilink "/docs/manual/advanced/data_on_fly" "Data preparation on the fly" >}}.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Image Quality        | CVAT has two types of data: original quality and compressed. Original quality images are used for dataset export<br> and automatic annotation. Compressed images are used only for annotations to reduce traffic between the server <br>and client side. <br> It is recommended to adjust the compression level only if the images contain small objects that are not <br>visible in the original quality. <br> Values range from `5` (highly compressed images) to `100` (not compressed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Overlap Size         | Use this parameter to create overlapped segments, making tracking continuous from one segment to another. <br><br>**Note** that this functionality only works for bounding boxes. <br><br>This parameter has the following options: <br><br>**Interpolation task** (video sequence). If you annotate with a bounding box on two adjacent segments, they will be<br> merged into a single bounding box. In case the overlap is zero or the bounding box is inaccurate (not enclosing the object <br>properly, misaligned or distorted) on the adjacent segments, it may be difficult to accurately interpolate the object's <br>movement between the segments. As a result, multiple tracks will be created for the same object. <br><br>**Annotation task** (independent images). If an object exists on overlapped segments with overlap greater than zero, <br>and the annotation of these segments is done properly, then the segments will be automatically merged into a single<br> object. If the overlap is zero or the annotation is inaccurate (not enclosing the object properly, misaligned, distorted) on the<br> adjacent segments, it may be difficult to accurately track the object. As a result, multiple bounding boxes will be <br>created for the same object. <br><br>If the annotations on different segments (on overlapped frames) are very different, you will have two shapes <br>for the same object. <br><br>To avoid this, accurately annotate the object on the first segment and the same object on the second segment to create a track <br>between two annotations. |
| Segment size         | Use this parameter to divide a dataset into smaller parts. For example, if you want to share a dataset among multiple<br> annotators, you can split it into smaller sections and assign each section to a separate job. <br>This allows annotators to work on the same dataset concurrently.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Start frame          | Defines the first frame of the video.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Stop frame           | Defines the last frame of the video.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Frame Step           | Use this parameter to filter video frames or images in a dataset. Specify frame step value to include only <br>certain frames or images in the dataset. <br>For example, if the frame step value is `25`, the dataset will include every 25th frame or image. If a video <br>has `100` frames, setting the frame step to `25` will include only frames `1`, `26`, `51`, `76`, and `100` in the dataset. <br>This can be useful for reducing the size of the dataset, or for focusing on specific frames or images that are <br>of particular interest.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Chunk size           | Defines amount of frames to be packed in a chunk when send from client to server. <br>The server defines automatically if the chunk is empty. <br>Recommended values: <li> 1080p or less: 36 <li> 2k or less: 8 <li>16 - 4k or less: 4 <li>8 - More: 1 - 4                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Issue tracker        | Use this parameter to specify the issue tracker URL.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Source storage       | Specify the source storage for importing resources like annotations and backups. <br>If the task was assigned to the project, use the **Use project source storage** toggle to determine whether to <br>use project values or specify new ones.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Target storage       | Specify the target storage (local or cloud) for exporting resources like annotations and backups. <br>If the task is created in the project, use the **Use project target storage** toggle to determine whether to<br> use project values or specify new ones.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

<!--lint enable maximum-line-length-->

To save and open the task, click **Submit & Open** .

To create several tasks in sequence, click **Submit & Continue**.

Created tasks will be displayed on the {{< ilink "/docs/manual/basics/tasks-page" "tasks page" >}}.
