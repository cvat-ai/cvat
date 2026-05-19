---
title: 'Import annotations and data to CVAT'
linkTitle: 'Import data to CVAT'
weight: 3
description: 'This section explains how to import datasets into projects, add data when creating tasks, and upload annotations to existing tasks or jobs.'
aliases:
 - /docs/manual/advanced/import-datasets/
---

## Importing a dataset into a project

You can import a dataset into a **project**. When you do this, CVAT:

- If the project has no defined labels, creates required labels based on the information available in the dataset.
Only label names can be imported this way, colors, attributes, and skeleton labels must be defined manually.
- Creates **new tasks** inside the project. If there are several subsets in the imported dataset, each one is imported
 as a separate task with the corresponding subset name.
- Populates each imported task with the imported data and annotations (if the format contains annotations).

> Note: Importing a dataset always creates a **new** task in the project.

![Project with opened "Actions" menu and highlighted "Import dataset" option](/images/image238.jpg)

To import a dataset into a project:

1. Open the project on the `Projects page`.
2. Open the `Actions` menu in the upper right corner.
3. Click `Import dataset`.
4. Select the dataset format.
5. Drag the file to the file upload area or click on the upload area to select the file through the explorer.

---

You can also import a dataset from **attached cloud storage**.

!["Import dataset" window with options and parameters](/images/image250.jpg)

1. First, select the annotation format.
2. Then, select a cloud storage connection from the list or use the default one configured for the project.
3. Specify the ZIP archive name in the `File name` field.

During the import process, you will be able to track the progress of the import on the `Requests page`.

## Importing a dataset into a task

You can also add data when you **create a task**. A task can be:

- Inside a **project** (linked to that project), or
- Standalone.

After a task is created, you cannot add more data. To add extra data, create another task.

To learn more about creating a task in CVAT, see [How to create and configure an annotation task](/docs/workspace/tasks-page#how-to-create-and-configure-an-annotation-task).

## Uploading annotations to tasks and jobs

If you already have a file with annotations or an annotated dataset,
you can upload it to an entire task or to a single job.

![Task with opened "Actions" menu and highlighted "Upload annotations" option](/images/image251.jpg)

{{% alert title="Warning" color="warning" %}}
When you upload annotations, CVAT removes the existing ones.
{{% /alert %}}

### Uploading annotations to a task

1. On the Tasks page, click the three dots next to the task.
2. Or open the task and go to the `Actions` menu.
3. Click `Upload annotations`.
4. Select the annotation format.
5. Upload the file from your computer or choose one from cloud storage.

!["Import annotation task" window with options and parameters](/images/image252.jpg)

### Uploading annotations to a job

1. Open the task, and click the three dots next to the job.
2. Click `Import annotations`.
3. Select the annotation format.
4. Upload the file from your computer or choose one from cloud storage.
