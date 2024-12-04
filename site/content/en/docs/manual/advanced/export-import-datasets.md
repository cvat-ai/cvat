---
title: 'Export and Import of annotations'
linkTitle: 'Export and Import of annotations'
weight: 19
description: 'This section explains how to download and upload annotations
  (including annotation, images, and metadata) of projects, tasks, and jobs.'
---

CVAT provides several options of importing and exporting of annotations. There are 3 levels
of data organization in CVAT: jobs, tasks and projects. Each of them has import and export options.
It is possible to import and export only annotations or whole datasets,
which include both annotations and images.

| **Level** | **Import** | **Export** |
| - | - | - |
| Job | annotations | annotations, dataset |
| Task | annotations | annotations, dataset |
| Project | annotations, dataset | annotations, dataset |


## Export annotations or a dataset

You can export annotations or a dataset from a project, task or job. This functionality
is available in the **Actions** menu of jobs, tasks and projects:

![](/images/task_actions_menu-export.jpg)

For jobs, it is also available in the job menu on the annotation page:

![](/images/job_menu-export.jpg)

### How to export

1. Press the `Export task dataset` button. A dialog with export parameters will appear:

  ![](/images/job_export_dialog.jpg)

1. Choose the format for exporting the dataset. Exporting and importing is available in:
- Standard CVAT formats:
  - {{< ilink "/docs/manual/advanced/xml_format#interpolation" "CVAT for video" >}}
    choose if the task is created in interpolation mode.
  - {{< ilink "/docs/manual/advanced/xml_format#annotation" "CVAT for images" >}}
    choose if a task is created in annotation mode.

    <br>
- And also in formats from the
  {{< ilink "/docs/manual/advanced/formats" "list of annotation formats supported by CVAT" >}}.

<br>
1. To download only annotations, disable the `Save images` option. If you want to include images
  in the exported dataset, enable the `Save images` option. It can be useful, particularly,
  if you created task from a video, and want to retrieve annotated frames.
  > `Save images` is a paid option. Please check how to get access to this
  > functionality in the {{< ilink "/docs/enterprise" "Paid features" >}} section of the site.

1. (Optional) To name the resulting archive, use the `Custom name` field.
1. You can choose a storage for dataset export by selecting a target storage `Local` or `Cloud storage`.
  The default settings are the settings that had been selected when the project was created
  (for example, if you specified a local storage when you created the project,
  then by default, you will be prompted to export the dataset to your PC).
  You can find out the default value by hovering the mouse over the `?`.
  Learn more about {{< ilink "/docs/manual/basics/attach-cloud-storage" "attach cloud storage" >}}.

1. Wait for the export to complete. When the operation is finished, you'll receive a notification
  in the top right corner. The results of the export will be available on the **Requests** page.

## Import dataset

You can import dataset only to a project. In this case, the data will be split into subsets.
To import a dataset, do the following on the `Project` page:

![](/images/image238.jpg)

- Open the `Actions` menu.
- Press the `Import dataset` button.
- Select the dataset format (if you did not specify a custom name during export,
  the format will be in the archive name).
- Drag the file to the file upload area or click on the upload area to select the file through the explorer.

![](/images/image250.jpg)

- You can also import a dataset from an attached cloud storage.
  Here you should select the annotation format, then select a cloud storage from the list or use default settings
  if you have already specified required cloud storage for task or project
  and specify a zip archive to the text field `File name`.

During the import process, you will be able to track the progress of the import.

## Upload annotations

![](/images/image251.jpg)

In the task or job you can upload an annotation. For this select the item `Upload annotation`
in the menu `Action` of the task or in the job `Menu` on the `Top panel` select the format in which you plan
to upload the annotation and select the annotation file or archive via explorer.

![](/images/image252.jpg)

Or you can also use the attached cloud storage to upload the annotation file.
