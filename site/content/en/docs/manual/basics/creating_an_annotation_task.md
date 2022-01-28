---
title: 'Creating an annotation task'
linkTitle: 'Creating an annotation task'
weight: 2
description: 'Instructions on how to create and configure an annotation task.'
---

Create an annotation task pressing `Create new task` button on the tasks page or on the project page.
![](/images/image004.jpg)

Specify parameters of the task:

## Basic configuration

### Name

The name of the task to be created.

![](/images/image005.jpg)

### Projects

The project that this task will be related with.

![](/images/image193.jpg)

### Labels

There are two ways of working with labels (available only if the task is not related to the project):

- The `Constructor` is a simple way to add and adjust labels. To add a new label click the `Add label` button.
  ![](/images/image123.jpg)

  You can set a name of the label in the `Label name` field and choose a color for each label.

  ![](/images/image124.jpg)

  If necessary you can add an attribute and set its properties by clicking `Add an attribute`:

  ![](/images/image125.jpg)

  The following actions are available here:

  1. Set the attribute’s name.
  1. Choose the way to display the attribute:
     - Select — drop down list of value
     - Radio — is used when it is necessary to choose just one option out of few suggested.
     - Checkbox — is used when it is necessary to choose any number of options out of suggested.
     - Text — is used when an attribute is entered as a text.
     - Number — is used when an attribute is entered as a number.
  1. Set values for the attribute. The values could be separated by pressing `Enter`.
     The entered value is displayed as a separate element which could be deleted
     by pressing `Backspace` or clicking the close button (x).
     If the specified way of displaying the attribute is Text or Number,
     the entered value will be displayed as text by default (e.g. you can specify the text format).
  1. Checkbox `Mutable` determines if an attribute would be changed frame to frame.
  1. You can delete the attribute by clicking the close button (x).

  Click the `Continue` button to add more labels.
  If you need to cancel adding a label - press the `Cancel` button.
  After all the necessary labels are added click the `Done` button.
  After clicking `Done` the added labels would be displayed as separate elements of different colour.
  You can edit or delete labels by clicking `Update attributes` or `Delete label`.

- The `Raw` is a way of working with labels for an advanced user.
  Raw presents label data in _json_ format with an option of editing and copying labels as a text.
  The `Done` button applies the changes and the `Reset` button cancels the changes.
  ![](/images/image126.jpg)

### Select files

Press tab `My computer` to choose some files for annotation from your PC.
If you select tab `Connected file share` you can choose files for annotation from your network.
If you select ` Remote source` , you'll see a field where you can enter a list of URLs (one URL per line).
If you upload a video or dataset with images and select `Use cache` option, you can attach a `manifest.jsonl` file.
You can find how to prepare it [here](/docs/manual/advanced/dataset_manifest/).
If you select the `Cloud Storage` tab, you can select a cloud storage (for this type the cloud storage name),
after that choose the manifest file and select the required files.
For more information on how to attach cloud storage, see [attach cloud storage](/docs/manual/basics/attach-cloud-storage/)

![](/images/image127.jpg)

### Data formats for a 3D task

To create a 3D task, you must prepare an archive with one of the following directory structures:
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

> You can't mix 2D and 3D data in the same task.

## Advanced configuration

![](/images/image128.jpg)

### Sorting method

Option to sort the data. It is not relevant for videos.
For example, the sequence `2.jpeg, 10.jpeg, 1.jpeg` after sorting will be:
- `lexicographical`: 1.jpeg, 10.jpeg, 2.jpeg
- `natural`: 1.jpeg, 2.jpeg, 10.jpeg
- `predefined`: 2.jpeg, 10.jpeg, 1.jpeg

### Use zip chunks

Force to use zip chunks as compressed data. Actual for videos only.

### Use cache

Defines how to work with data. Select the checkbox to switch to the "on-the-fly data processing",
which will reduce the task creation time (by preparing chunks when requests are received)
and store data in a cache of limited size with a policy of evicting less popular items.
See more [here](/docs/manual/advanced/data_on_fly/).

### Image Quality

Use this option to specify quality of uploaded images.
The option helps to load high resolution datasets faster.
Use the value from `5` (almost completely compressed images) to `100` (not compressed images).

## Overlap Size

Use this option to make overlapped segments.
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
  Polygons, polylines, points don't support automatic merge on overlapped segments
  even the overlap parameter isn't zero and match between corresponding shapes on adjacent segments is perfect.

### Segment size

Use this option to divide a huge dataset into a few smaller segments.
For example, one job cannot be annotated by several labelers (it isn't supported).
Thus using "segment size" you can create several jobs for the same annotation task.
It will help you to parallel data annotation process.

### Start frame

Frame from which video in task begins.

### Stop frame

Frame on which video in task ends.

### Frame Step

Use this option to filter video frames.
For example, enter `25` to leave every twenty fifth frame in the video or every twenty fifth image.

### Chunk size

Defines a number of frames to be packed in a chunk when send from client to server.
Server defines automatically if empty.

Recommended values:

- 1080p or less: 36
- 2k or less: 8 - 16
- 4k or less: 4 - 8
- More: 1 - 4

### Dataset Repository

URL link of the repository optionally specifies the path to the repository for storage
(`default: annotation / <dump_file_name> .zip`).
The .zip and .xml file extension of annotation are supported.
Field format: `URL [PATH]` example: `https://github.com/project/repos.git [1/2/3/4/annotation.xml]`

Supported URL formats :

- `https://github.com/project/repos[.git]`
- `github.com/project/repos[.git]`
- `git@github.com:project/repos[.git]`

After the task is created, the synchronization status is displayed on the task page.

### Use LFS

If the annotation file is large, you can create a repository with
[LFS](https://git-lfs.github.com/) support.

### Issue tracker

Specify full issue tracker's URL if it's necessary.

Push `Submit` button and it will be added into the list of annotation tasks.
Then, the created task will be displayed on a [tasks page](/docs/manual/basics/tasks-page/).
