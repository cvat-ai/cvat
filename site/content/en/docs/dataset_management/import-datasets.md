---
title: 'Import annotations and data to CVAT'
linkTitle: 'Import data to CVAT'
weight: 3
description: 'This section explains how to upload datasets (including annotation, images, and metadata) to projects and tasks.'
aliases:
 - /docs/manual/advanced/import-datasets/
---

## Import dataset

You can import dataset only to a project. In this case, the data will be split into subsets.
To import a dataset, do the following on the `Project` page:

![Project with opened "Actions" menu and highlighted "Import dataset" option](/images/image238.jpg)

- Open the `Actions` menu.
- Press the `Import dataset` button.
- Select the dataset format (if you did not specify a custom name during export,
  the format will be in the archive name).
- Drag the file to the file upload area or click on the upload area to select the file through the explorer.

!["Import dataset" window with options and parameters](/images/image250.jpg)

- You can also import a dataset from an attached cloud storage.
  Here you should select the annotation format, then select a cloud storage from the list or use default settings
  if you have already specified required cloud storage for task or project
  and specify a zip archive to the text field `File name`.

During the import process, you will be able to track the progress of the import.

## Upload annotations

![Task with opened "Actions" menu and highlighted "Upload annotations" option](/images/image251.jpg)

In the task or job you can upload an annotation. For this select the item `Upload annotation`
in the menu `Action` of the task or in the job `Menu` on the `Top panel` select the format in which you plan
to upload the annotation and select the annotation file or archive via explorer.

!["Import annotation task" window with options and parameters](/images/image252.jpg)

Or you can also use the attached cloud storage to upload the annotation file.
