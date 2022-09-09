---
title: 'Backup Task and Project'
linkTitle: 'Backups'
weight: 17
---

## Overview

In CVAT you can backup tasks and projects.
This can be used to backup a task or project on your PC or to transfer to another server.

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
