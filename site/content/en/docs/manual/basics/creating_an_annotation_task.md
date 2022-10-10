---
title: 'Creating an annotation task'
linkTitle: 'Creating an annotation task'
weight: 2
description: 'Create and configure an annotation task.'
---

## Before you start

1. Click **+** on the tasks page or on the project page.
1. Select **Create new task**.

    The task will be created in the [organization](../../manual/advanced/organization.md) that you selected at the time of creation.

1. Specify parameters of the task:
* **Name** — the name of the task to be created.
* **Project** — which is related with the task.
* [**Labels**](../basics/creating_an_annotation_task.md#labels) — available only if the task is not related to the project.
* [**Select files**](../basics/creating_an_annotation_task.md#select-files) — selecting the source for uploading the files.
* [**Data formats for a 3D task**](../basics/creating_an_annotation_task.md#data-formats-for-a-3d-task) — formats a 3D task.

### Labels

There are two ways of working with labels:

**Constructor**
1. Сlick **Add label**.
1. Set a name of the label in the **Label name** field
1. Choose a color for each label.
1. (optional) Add an attribute and set its properties by clicking **Add an attribute**:
    
    1.1. Set the attribute’s name.
    
    1.1. Choose the way to display the attribute:
      - _Select_ — the drop down list of values;
      - _Radio_ — one option out of few suggested;
      - _Checkbox_ — any number of options out of suggested;
      - _Text_ — an attribute is entered as a text;
      - _Number_ — an attribute is entered as a number.
    
    1.1. Set the values for the attribute. Press _Enter_ to separate the values.
     Press _Backspace_ or click the (x) button to delete the entered value.
     If the specified way of displaying the attribute is _Text_ or _Number_,
     the entered value displays as text by default (e.g. you can specify the text format).
    
    1.1. Click the close button (x) to delete the attribute.
1. Choose **Mutable** checkbox if the attribute changes from frame to frame.
1. Click **Continue** to add more labels.
1. After all the necessary labels are added, click **Done**. The added labels are displayed as separate elements of different colours.

  To update the labels click **Update attributes**.

**Raw** is a way of working with labels for an advanced user.
  Raw presents label data in _json_ format with an option of editing and copying labels as a text.
  The `Done` button applies the changes and the `Reset` button cancels the changes.

### Select files

To select the files, click the tab:
* **My computer** — to choose the files for annotation from your PC.
* **Connected file share** — choose the files for annotation from your network.
* **Remote source** — enter a list of URLs (one URL per line).
If you upload a video or dataset with images and select **Use cache** option, you can attach a [`manifest.jsonl` file](../advanced/dataset_manifest.md)
* **Cloud Storage** — select a cloud storage (for this type the cloud storage name), choose the manifest file and select the required files.
For more information on how to attach a cloud storage, see [Attach a cloud storage](../basics/attach-cloud-storage.md).
### Data formats for a 3D task

To create a 3D task, prepare an archive with one of the following directory structures:
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

> Do not mix 2D and 3D data in the same task.

## Advanced configuration

### Sorting method

Sorts the data. It is not relevant for videos.
For example, the sequence _2.jpeg, 10.jpeg, 1.jpeg_ after sorting will be:
- lexicographical: 1.jpeg, 10.jpeg, 2.jpeg
- natural: 1.jpeg, 2.jpeg, 10.jpeg
- predefined: 2.jpeg, 10.jpeg, 1.jpeg

### Use zip/video chunks

Force to use zip chunks as compressed data. Cut out content for videos only.

### Use cache

Defines how to work with data.
To reduce the task creation time switch the checkbox to the **on-the-fly data processing**. [On the-fly-data processing](../advanced/data_on_fly.md) prepares the chunks when requests are received, and store data in a cache of limited size, evicting less popular items.

### Image Quality

Defines the quality of uploaded images.
The option helps to load high resolution datasets faster.
Use the value from `5` (almost completely compressed images) to `100` (not compressed images).

### Overlap Size

Makes overlapped segments.
The option makes tracks continuous from one segment into another.
Use it for interpolation mode. There are several options for using the parameter:

- For an interpolation task (video sequence).
  If you annotate a bounding box on two adjacent segments they will be merged into one bounding box.
  If overlap equals to zero or annotation is poor on adjacent segments inside a dumped annotation file,
  you will have several tracks, one for each segment, which corresponds to the object.
- For an annotation task (independent images).
  If an object exists on overlapped segments, the overlap is greater than zero
  and the annotation is good enough on adjacent segments, it will be automatically merged into one object.
  If overlap equals to zero or annotation is poor on adjacent segments inside a dumped annotation file,
  you will have several bounding boxes for the same object.
  Thus, you annotate an object on the first segment.
  You annotate the same object on second segment, and if you do it right, you
  will have one track inside the annotations.
  If annotations on different segments (on overlapped frames)
  are very different, you will have two shapes for the same object.
  This functionality works only for bounding boxes.
  Polygons, polylines, points don't support automatic merge on the overlapped segments
  even if the overlap parameter isn't zero and the match between corresponding shapes on adjacent segments is perfect.

### Segment size

Divides a big dataset into a few smaller segments.
For example, one job cannot be annotated by several labelers (it isn't supported).
Thus using **Segment size** you can create several jobs for the same annotation task.
It helps you to parallel data annotation process.

### Start frame

Frame from which video in the task begins.

### Stop frame

Frame on which video in the task ends.

### Frame Step

Use this option to filter the video frames.
For example, enter `25` to leave every twenty fifth frame in the video or every twenty fifth image.

### Chunk size

Defines a number of frames to be packed in a chunk sent from client to server.
Server defines automatically if empty.

Recommended values:

- 1080p or less: 36
- 2k or less: 8 - 16
- 4k or less: 4 - 8
- More: 1 - 4

### Dataset Repository

URL link of the repository optionally specifies the path to the repository for storage (`default: annotation / <dump_file_name> .zip`).
The .zip and .xml file extension of annotation are supported.

Field format: `URL [PATH]`
Example: `https://github.com/project/repos.git [1/2/3/4/annotation.xml]`

Supported URL formats :

- `https://github.com/project/repos[.git]`
- `github.com/project/repos[.git]`
- `git@github.com:project/repos[.git]`

After the task is created, the synchronization status is displayed on the task page.

If you specify a dataset repository, when you create a task, you will see a message
about the need to grant access with the SSH key.
This is the key you need to [add to your github account](https://github.com/settings/keys).
For other git systems, you can learn about adding an SSH key in their documentation.

### Use LFS

If the annotation file is large, you can create a repository with [LFS](https://git-lfs.github.com/) support.

### Issue tracker

Specify full issue tracker's URL if it is necessary.

### Source storage

Specify source storage for import resources like annotations and backups. It can be a local or a cloud storage.
If the task is created in the project, then the **Use project source storage** switch will determine whether
to use the default values ​​or specify new ones.

### Target storage

Specify target storage for export resources like annotations and backups. It can be a local or a cloud storage.
If the task is created in the project, then the **Use project target storage** switch will determine whether
to use the default values ​​or specify new ones.

Click:
* **Submit & Open** — to save and open the task;
* **Submit & Continue** — to create several tasks in sequence.

The created tasks are displayed on a [tasks page](../basics/tasks-page.md).
