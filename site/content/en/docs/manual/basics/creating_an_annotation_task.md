---
title: 'Creating an annotation task'
linkTitle: 'Creating an annotation task'
weight: 2
description: 'Instructions on how to create and configure an annotation task.'
---

Create an annotation task pressing `+` button and select `Create new task` on the tasks page or on the project page.
![](/images/image004.jpg)

> Notice that the task will be created in the organization that you selected at the time of creation.
> Read more about [organizations](/docs/manual/advanced/organization/).

Specify parameters of the task:

## Basic configuration

### Name

The name of the task to be created.

![](/images/image005.jpg)

### Projects

The project that this task will be related to.

![](/images/image193.jpg)

### Labels

If the task is related to a project, project labels will be used.
If the task is not related to any project, there are two ways of working with labels:

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
  1. Set values for the attribute:
     - Multiple values (for attributes represented as Select, Radio or Checkbox) are separated by pressing `Enter`.
     The entered value is displayed as a separate element which can be removed by pressing `Backspace` or clicking the close button (x).
     - If an attribute is represented as Text, its default value is a string.
     - If Number is chosen as the way attribute is shown as, value is required to contain 3 numbers, separated by semicolons:
     minimum value, maximum value and icrement.
  1. Checkbox `Mutable` determines if an attribute would be changeable frame to frame.


  Click the `Continue` button to add more labels.
  If you need to cancel an adding of a label - use the `Cancel` button.
  After all the necessary labels are added click the `Done` button.
  After clicking `Done` the added labels will be displayed as separate elements of different colour.
  You can edit or delete labels by clicking `Update attributes` or `Delete label`.

- The `Raw` is a way of working with labels for an advanced user.
  Raw presents label data in _json_ format with an option of editing and copying labels as a text.
  The `Done` button applies the changes and the `Reset` button cancels the changes.
  ![](/images/image126.jpg)

### Select files

Press tab `My computer` to choose some files for annotation from your PC.
If you select tab `Connected file share` you can choose files for annotation from your network.
If you select ` Remote source` , you will see a field where you can enter a list of URLs (one URL per line).
If you upload a video or dataset with images and select `Use cache` option, you can attach a `manifest.jsonl` file.
You can find how to make one [here](/docs/manual/advanced/dataset_manifest/).
If you select the `Cloud Storage` tab, you will be able to select a cloud storage by typing the cloud storage name,
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

### Use zip/video chunks

Force to use zip chunks as compressed data. Cut out content for videos only.

### Use cache

Defines how to work with data. Select the checkbox to switch to the "on-the-fly data processing",
which will reduce the task creation time (by preparing chunks when requests are received)
and store data in a cache of limited size with a policy of evicting less popular items.
See more [here](/docs/manual/advanced/data_on_fly/).

### Image Quality

Use this option to specify quality of uploaded images.
The option helps to load high resolution datasets faster.
Uses the value from `5` (almost completely compressed images) to `100` (not compressed images).

### Overlap Size

Use this option to make overlapped segments.
The option makes tracks continuous from one segment into another.
Use it for interpolation mode. There are several ways of using this option:

- For an interpolation task (video sequence):
  If you annotate a bounding box on two adjacent segments, they will be merged into one bounding box.
  If overlap equals zero or annotation is poor on adjacent segments inside a dumped annotation file,
  you will have several tracks, one for each segment, which corresponds to the object.
- For an annotation task (independent images):
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
  Polygons, polylines, points do not support automatic merge on overlapped segments
  even if the overlap parameter does not equal zero and the match between corresponding shapes on adjacent segments is perfect.

### Segment size

Use this option to divide a huge dataset into a few smaller segments.
For example, one job cannot be annotated by several labelers (not supported).
Thus using "segment size" you can create several jobs for the same annotation task.
It will help you to parallel data annotation process.

### Start frame

Sets a frame in the video file as a starting point for annotation.

### Stop frame

Sets a frame in the video file as an ending point for annotation.

### Frame Step

Use this option to filter video frames.
For example, enter `25` to leave every twenty fifth frame in the video or every twenty fifth image.

### Chunk size

Defines a number of frames to be packed in a chunk when sent from client to server.
Server sets this parameter automatically if this is left empty.

Recommended values:

- 1080p or less: 36
- 2k or less: 8 - 16
- 4k or less: 4 - 8
- More: 1 - 4

### Dataset Repository

URL link of the repository optionally specifies the path to the storage repository
(`default: annotation / <dump_file_name> .zip`).
The .zip and .xml file extensions of annotation are supported.
Field format: `URL [PATH]` example: `https://github.com/project/repos.git [1/2/3/4/annotation.xml]`

Supported URL formats :

- `https://github.com/project/repos[.git]`
- `github.com/project/repos[.git]`
- `git@github.com:project/repos[.git]`

After the task is created, the synchronization status is displayed on the task page.

If you specify a dataset repository, when you create a task, you will see a message
about the necessity to grant access with the ssh key.
This is the key you need to [add to your github account](https://github.com/settings/keys).
For other git systems, you can learn how to add an ssh key in corresponding documentation.

### Use LFS

If the annotation file is too large, you can create a repository with
[LFS](https://git-lfs.github.com/) support.

### Issue tracker

Specify full issue tracker's URL if necessary.

### Source storage

Specify source storage for import resources like annotations and backups. It can be a local or a cloud storage.
If the task is created in the project, then the `Use project source storage` switch will determine whether
to use the default values ​​or specify new ones.

### Target storage

Specify target storage for export resources like annotations and backups. It can be a local or a cloud storage.
If the task is created in the project, then the `Use project target storage` switch will determine whether
to use the default values ​​or specify new ones.

To save and open task click on `Submit & Open` button. Also you
can click on `Submit & Continue` button to create next tasks in sequence to this one.
Then the created tasks will be displayed on the [tasks page](/docs/manual/basics/tasks-page/).
