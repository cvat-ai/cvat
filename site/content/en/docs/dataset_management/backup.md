---
title: 'Backup Task and Project'
linkTitle: 'Backup'
weight: 17
aliases:
- /docs/manual/advanced/backup/
- /docs/annotation/tools/backup/
---

## Overview

In CVAT you can backup tasks and projects.
This can be used to backup a task or project on your PC or to transfer to another server.

## Create backup

To backup a task or project, open the action menu and select `Backup Task` or `Backup Project`.

![Opened project menu with highlighted "Backup project" option](/images/image219.jpg)

You can backup a project or a task locally on your PC or using an
{{< ilink "/docs/workspace/attach-cloud-storage" "attached cloud storage" >}}.

The dialog includes a switch **`Use lightweight backup whenever possible`**.
When enabled, CVAT creates a lightweight backup for data that comes from attached cloud storage:
the backup stores task/project meta and annotations and **does not** copy raw media files.
This reduces backup size and time for cloud-backed data.
The switch has no effect on a tasks, whose data is located on CVAT.
The switch is enabled by default.

(Optional) Specify the name in the `Custom name` text field for backup, otherwise the file of backup name
will be given by the mask `project_<project_name>_backup_<date>_<time>.zip` for the projects
and `task_<task_name>_backup_<date>_<time>.zip` for the tasks.

!["Export project" window with backup parameters](/images/image253.jpg)

If you want to save a backup to a specific
{{< ilink "/docs/workspace/attach-cloud-storage" "attached cloud storage" >}},
you should additionally turn off the switch `Use default settings`, select the `Cloud storage` value
in the `Target storage` and select this storage in the list of the attached cloud storages.

## Create backup APIs

- endpoints:
  - `/tasks/{id}/backup`
  - `/projects/{id}/backup`
- method: `GET`
- responses: 202, 201 with zip archive payload

### Upload backup APIs

- endpoints:
  - `/api/tasks/backup`
  - `/api/projects/backup`
- method: `POST`
- Content-Type: `multipart/form-data`
- responses: 202, 201 with json payload

## Create from backup

To create a task or project from a backup, go to the tasks or projects page,
click the `Create from backup` button and select the archive you need.

![Task list with opened menu and highlighted "Create from backup" option](/images/image220.jpg)

As a result, you'll get a task containing data, parameters, and annotations of
the previously exported task.

> Note: When restoring from a **lightweight backup**, CVAT creates a task which is not attached to cloud storage.
> Data cannot be fetched until cloud storage is attached on a Task page.

## Backup file structure

As a result, you'll get a zip archive containing data,
task or project and task specification and annotations with the following structure:

{{< tabpane >}}
  {{< tab header="Task Backup Structure" >}}
    .
    ├── data
    │   └── {user uploaded data}
    ├── task.json
    └── annotations.json
  {{< /tab >}}
  {{< tab header="Project Backup Structure" >}}
    .
    ├── task_{id}
    │   ├── data
    │   │   └── {user uploaded data}
    │   ├── task.json
    │   └── annotations.json
    └── project.json
  {{< /tab >}}
{{< /tabpane >}}
