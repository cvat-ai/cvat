---
title: 'Export/import a task'
linkTitle: 'Export/import'
weight: 25
---

In CVAT you can export and import tasks.
This can be used to backup the task on your PC or to transfer the task to another server.

## Export task

To export a task, open the action menu and select `Export Task`.

![](/images/image219_mapillary_vistas.jpg)

As a result, you'll get a zip archive containing data, task specification and annotations with the following structure:

```
.
├── data
│   ├── {user uploaded data}
│   ├── manifest.jsonl
├── task.json
└── annotations.json
```

Export task API:

- endpoint: `/api/v1/tasks/{id}?action=export​`
- method: `GET`
- returns: zip archive

## Import task

To import a task from an archive, go to the tasks page, click the `Import Task` button and select the archive you need.

![](/images/image220.jpg)

As a result, you'll get a task containing data, parameters, and annotations of the previously exported task.

Import task API:

- endpoint: `/api/v1/tasks?action=import​`
- method: `POST`
- Content-Type: `multipart/form-data​`
- returns: json

## Export project (not implemented)

Export project API

- endpoint: `/api/v1/projects/<id>?action=export​`
- method: `GET`
- returns: zip archive
  The zip archive has the following structure:

  ```
   .
   ├── tasks
   │   ├── task_1
   │   ├── task_2
   │   ├── ...
   │   └── task_N
   └── project.json
  ```

## Import project (not implemented)

Import project API:

- endpoint: `/api/v1/projects?action=import​`
- method: `POST`
- Content-Type: `multipart/form-data​`
- returns: json
