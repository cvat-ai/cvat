---
title: 'Backup Task and Project'
linkTitle: 'Backup'
weight: 17
---

In CVAT you can backup tasks and projects.
This can be used to backup a task or project on your PC or to transfer to another server.

## Backup

To backup a task or project, open the action menu and select `Backup Task` or `Backup Project`.

![](/images/image219.jpg)

### Backup structure

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

### Backup API

- endpoint: `/tasks/{id}/backup` or `/projects/{id}/backup`
- method: `GET`
- responses: 202, 201 with zip archive payload

## Create from backup

To create a task or project from a backup, go to the tasks or projects page,
click the `Create from backup` button and select the archive you need.

![](/images/image220.jpg)

As a result, you'll get a task containing data, parameters, and annotations of the previously exported task.

### Create from backup API

- endpoint: `/api/tasks/backup` or `/api/projects/backup`
- method: `POST`
- Content-Type: `multipart/form-data`
- responses: 202, 201 with json payload
