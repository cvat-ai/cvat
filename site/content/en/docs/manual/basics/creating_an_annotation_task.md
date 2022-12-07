---
title: 'Create annotation task'
linkTitle: 'Create annotation task'
weight: 2
description: 'How to create and configure an annotation task.'
---

To start annotating in CVAT, you need to create an annotation task and specify its parameters.

To create a task, on the tasks page or the project page click **+** and
select **Create new task**.

![Create new task](/images/image004.jpg)

## Basic configuration

Use a basic configuration window to create a simple task with minimum parameters.

![Basic configurator](/images/basic_confugurator.jpg)

To create a basic configuration task, do the following:

1. In the **Name** field, enter the name of the new task.

   ![Name of task](/images/image005.jpg)

2. (Optional) From the **Projects** drop-down, select a project for the new task.
   <br>Leave this field empty if you do not want to add the task to any project.

   ![Select project](/images/image193.jpg)

   > **Note:** Further steps are valid if the task does not belong to the project. If the task is in
   > project, the project's labels will be applied to the task.

3. On the **Constructor** tab, click **Add label**, the label constructor menu will open:

   ![Label constructor](/images/image124.jpg)

4. In the **Label name** field, enter the name of the label.
5. (Optional) To limit the use of the label to a certain [shape tool](/docs/manual/basics/controls-sidebar/#shapes),
   from the **Label shape** drop-down select the shape.
6. (Optional) Select the color for the label.

   ![label shape and color](/images/label_shape.jpg)

7. (Optional) Click **Add an attribute** to add [attribute](#add-an-attribute) and its properties.
8. Click [**Select files**](#select-files).
9. Click **Continue** to submit the label and start adding a new one
   <br> **Cancel** will abort current label and return you to labels list.
10. Click **Submit and open** to submit the configuration and open the created task,
    or **Submit and continue**, to submit the configuration and start a new task.

### Label shape

**Label shape** limits the use of the label to certain [shape tool](/docs/manual/basics/controls-sidebar/#shapes).

`Any` - is the default shape, that does not limit shape types.

For example, you added:

- Label `sun` with the **Label shape** type `ellipse`
- Lable `car` with the **Label shape** type `any`

As a result:

- The `sun` label will be available only for
  **Draw new ellipse**.
- The `car` label will be available for all shapes.

  ![Label shape](/images/label_shape.gif)

You can change the shape of the label at any moment.
The change will not affect the existing annotation.

> **Note:** You cannot change the shape of the label
> that was created as `skeleton`.
> <br>The **Label shape** field is disabled for `skeleton` labels.

For example, if the objects were created by polygons, and then the label
the shape was changed to polylines, all previously created objects will
be polygons, but you will not be able to add new polygon
objects with the same label.

### Add an attribute

**Attribute** is an additional label data, that you can use for annotation.

For example, you created the label `face` and also want to clarify
the type of face.
To avoid adding extra labels, you can add attributes of the
`face`: `male` or `female`.

Added attributes will be available from the Objects menu:

![Attributes](/images/attributes.jpg)

To add an attribute, do the following:

1. In the **Name** field add the attribute’s name.
2. From the drop-down, select way to display the attribute:
   - `Radio` to choose one of several options.
   - `Checkbox` to choose several options.
   - `Text` to add text attribute.
   - `Number` to add number attribute.
3. Set values for the attribute. To separate values use **Enter**.
   To delete the added value, use **Backspace** or near the name of the value, click **x**.
   > ** Note:** If the specified way of displaying the attribute is `Text` or `Number`,
   > the entered value will be displayed as text by default (you can specify the text format).
4. Select **Mutable** if an attribute would be changed from frame to frame.

To delete an attribute, click **Delete attribute**.

### Select files

There are several ways to upload files for annotation:

- To upload the file from your PC, go to the **My computer** tab.
- To upload files from a connected file share or network, go to the **Connected file share** tab.
- To upload files from remote sources, go to the **Remote source** tab. Enter a list of URLs (one
  per line). If you upload a video or dataset with images and select the **Use cache** option, you
  can attach a `manifest.json` file.
  <br> On how to prepare the `manifest.json` file, see [Dataset manifest.](/docs/manual/advanced/dataset_manifest/)
- To upload files from cloud storage, go to the **Cloud Storage** tab. Type the cloud storage name,
  and after that choose the manifest file and select the required files.
  <br> For more information, see [Attach cloud storage](/docs/manual/basics/attach-cloud-storage/)

### RAW

The **Raw** is a way of working with labels for an advanced user.

![](/images/image126.jpg)

Raw presents label data in _.json_ format with an option of editing and copying labels as text.
The **Done** button applies the changes and the **Reset** button cancels the changes.

### Data formats for a 3D task

To create a 3D task, you must prepare an archive with one of the following directory structures:

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

> You can't mix 2D and 3D data in the same task.

## Advanced configuration

![](/images/image128.jpg)

### Sorting method

To sort image data select one of the sorting methods.

> **Note:** you cannot sort the video data.

For example, the sequence `2.jpeg`, `10.jpeg`, `1.jpeg` after sorting will be:

- **Lexicographica**: `1.jpeg`, `10.jpeg`, `2.jpeg`
- **Natural**: `1.jpeg`, `2.jpeg`, `10.jpeg`
- **Predefined**: `2.jpeg`, `10.jpeg`, `1.jpeg`
- **Random** uploads data in random order.

### Use zip/video chunks

Force to use zip chunks as compressed data. Cut out content for videos only.

### Use cache

Defines how to work with data. Select the checkbox to switch to "on-the-fly data processing",
which will reduce the task creation time (by preparing chunks when requests are received)
and store data in a cache of limited size with a policy of evicting less popular items.
See more [here](/docs/manual/advanced/data_on_fly/).

### Image Quality

Use this option to specify the quality of uploaded images.
The option helps to load high-resolution datasets faster.
Use the value from `5` (almost completely compressed images) to `100` (not compressed images).

### Overlap Size

Use this option to make overlapped segments.
The option makes tracks continuous from one segment into another.
Use it for interpolation mode. There are several options for using the parameter:

- For an interpolation task (video sequence).
  If you annotate a bounding box on two adjacent segments they will be merged into one bounding box.
  If overlap equals zero or annotation is poor on adjacent segments inside a dumped annotation file,
  you will have several tracks, one for each segment, which corresponds to the object.
- For an annotation task (independent images).
  If an object exists on overlapped segments, the overlap is greater than zero
  and the annotation is good enough on adjacent segments, it will be automatically merged into one object.
  If overlap equals zero or annotation is poor on adjacent segments inside a dumped annotation file,
  you will have several bounding boxes for the same object.
  Thus, you annotate an object on the first segment.
  You annotate the same object on the second segment, and if you do it right, you
  will have one track inside the annotations.
  If annotations on different segments (on overlapped frames)
  are very different, you will have two shapes for the same object.
  This functionality works only for bounding boxes.
  Polygons, polylines, and points don't support automatic merge on overlapped segments
  even if the overlap parameter isn't zero and the match between corresponding shapes on adjacent segments is perfect.

### Segment size

Use this option to divide a huge dataset into a few smaller segments.
For example, one job cannot be annotated by several labelers (it isn't supported).
Thus using "segment size" you can create several jobs for the same annotation task.
It will help you to parallel the data annotation process.

### Start frame

Frame from which video in task begins.

### Stop frame

The frame on which the video in the task ends.

### Frame Step

Use this option to filter video frames.
For example, enter `25` to leave every twenty-fifth frame in the video or every twenty-fifth image.

### Chunk size

Defines several frames to be packed in a chunk when send from client to server.
The server defines automatically if empty.

Recommended values:

- 1080p or less: 36
- 2k or less: 8 - 16
- 4k or less: 4 - 8
- More: 1 - 4

### Dataset Repository

URL link of the repository optionally specifies the path to the repository for storage
(`default: annotation / <dump_file_name> .zip`).
The .zip and .xml file extensions of annotation are supported.
Field format: `URL [PATH]` example: `https://github.com/project/repos.git [1/2/3/4/annotation.xml]`

Supported URL formats :

- `https://github.com/project/repos[.git]`
- `github.com/project/repos[.git]`
- `git@github.com:project/repos[.git]`

After the task is created, the synchronization status is displayed on the task page.

If you specify a dataset repository, when you create a task, you will see a message
about the need to grant access with the ssh key.
This is the key you need to [add to your github account](https://github.com/settings/keys).
For other git systems, you can learn about adding an ssh key in their documentation.

### Use LFS

If the annotation file is large, you can create a repository with
[LFS](https://git-lfs.github.com/) support.

### Issue tracker

Specify the full issue tracker's URL if it's necessary.

### Source storage

Specify source storage for import resources like annotations and backups. It can be a local or cloud storage.
If the task is created in the project, then the **Use project source storage** switch will determine whether
to use the default values ​​or specify new ones.

### Target storage

Specify target storage for export resources like annotations and backups. It can be a local or cloud storage.
If the task is created in the project, then the **Use project target storage** switch will determine whether
to use the default values ​​or specify new ones.

To save and open the task click on the **Submit & Open** button. Also, you
can click on the** Submit & Continue** button for creating several tasks in sequence.
Then, the created tasks will be displayed on a [tasks page](/docs/manual/basics/tasks-page/).
