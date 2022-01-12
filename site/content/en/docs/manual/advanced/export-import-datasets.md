---
title: 'Export/import datasets and upload annotation'
linkTitle: 'Export/import datasets'
weight: 18
description: 'This section explains how to download and upload datasets
  (including annotation, images, and metadata) of projects, tasks, and jobs.'
---

## Export dataset

You can export a dataset to a project, task or job.

1. To download the latest annotations, you have to save all changes first.
   Сlick the `Save` button. There is a `Ctrl+S` shortcut to save annotations quickly.

   ![](/images/image028.jpg)

1. After that, сlick the `Menu` button.
   Exporting and importing of task and project datasets takes place through the `Action` menu.
1. Press the `Export task dataset` button.

   ![](/images/image225.jpg)

1. Choose the format for exporting the dataset. Exporting and importing is available in:
   - Standard CVAT formats:
     - [CVAT for video](/docs/manual/advanced/xml_format/#interpolation)
       choose if the task is created in interpolation mode.
     - [CVAT for images](/docs/manual/advanced/xml_format/#annotation)
       choose if a task is created in annotation mode.

       <br>
   - And also in formats from the [list of annotation formats supported by CVAT](/docs/manual/advanced/formats/).

   - For 3D tasks, the following formats are available:
     - [Kitti Raw Format 1.0](http://www.cvlibs.net/datasets/kitti/raw_data.php)
     - Sly Point Cloud Format 1.0  - Supervisely Point Cloud dataset

   <br>
1. To download images with the dataset, tick the `Save images` box.
1. (Optional) To name the resulting archive, use the `Custom name` field.

## Import dataset

You can import dataset only to a project. In this case, the data will be split into subsets.
To import a dataset, do the following on the `Project` page:

![](/images/image238.jpg)

- Open the `Actions` menu.
- Press the `Import dataset` button.
- Select the dataset format (if you did not specify a custom name during export,
  the format will be in the archive name).
- Drag the file to the file upload area or click on the upload area to select the file through the explorer.

During the import process, you will be able to track the progress of the import.

## Upload annotations

In the task or job you can upload an annotation. For this select the item `Upload annotation`
in the menu `Action` of the task or in the job `Menu` on the `Top panel` select the format in which you plan
to upload the annotation and select the annotation file or archive via explorer.
