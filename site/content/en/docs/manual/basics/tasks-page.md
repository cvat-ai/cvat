---
title: 'Tasks page'
linkTitle: 'Tasks page'
weight: 5
description: 'Overview of the Tasks page.'
---

![](/images/image006_detrac.jpg)

The tasks page contains elements and each of them relates to a separate task. They are sorted in creation order.
Each element contains: task name, preview, progress bar, button `Open`, and menu `Actions`.
Each button is responsible for a in menu `Actions` specific function:

- `Export task dataset` — download annotations or annotations and images in a specific format.
  More information is available in the {{< ilink "/docs/manual/advanced/import-datasets" "export/import datasets" >}}
  section.
- `Upload annotation` upload annotations in a specific format.
  More information is available in the {{< ilink "/docs/manual/advanced/import-datasets" "export/import datasets" >}}
  section.
- `Automatic Annotation` — automatic annotation with OpenVINO toolkit.
  Presence depends on how you build the CVAT instance.
- `Backup task` — make a backup of this task into a zip archive.
  Read more in the {{< ilink "/docs/manual/advanced/backup" "backup" >}} section.
- `Move to project` — Moving a task to a project (you can move only a task which does not belong to any project).
  In case of label mismatch, you can create or delete necessary labels in the project/task.
  Some task labels can be matched with the target project labels.
- `Delete` — delete task.

In the upper left corner there is a search bar, using which you can find the task by assignee, task name etc.
In the upper right corner there are [sorting][sorting], [quick filters][quick-filters] and filter.

## Filter

> Applying filter disables the [quick filter][quick-filters].

The filter works similarly to the filters for annotation,
you can create rules from [properties](#supported-properties-for-tasks-list),
[operators][operators] and values and group rules into [groups][groups].
For more details, see the [filter section][create-filter].
Learn more about [date and time selection][data-and-time].

For clear all filters press `Clear filters`.

### Supported properties for tasks list

| Properties     | Supported values                             | Description                                 |
| -------------- | -------------------------------------------- | ------------------------------------------- |
| `Dimension`    | `2D` or `3D`                                 | Depends on the data format <br>(read more in {{< ilink "/docs/manual/basics/create_an_annotation_task" "creating an annotation task" >}}) |
| `Status`       | `annotation`, `validation` or `completed`    |                                             |
| `Data`         | `video`, `images`                            | Depends on the data format <br>(read more in {{< ilink "/docs/manual/basics/create_an_annotation_task" "creating an annotation task" >}}) |
| `Subset`       | `test`, `train`, `validation` or custom subset | [read more] [subset]                      |
| `Assignee`     | username                                     | Assignee is the user who is working on the project, task or job. <br>(is specified on task page) |
| `Owner`        | username                                     | The user who owns the project, task, or job |
| `Last updated` | last modified date and time (or value range) | The date can be entered in the `dd.MM.yyyy HH:mm` format <br>or by selecting the date in the window that appears <br>when you click on the input field |
| `ID`           | number or range of job ID                    |                                             |
| `Project ID`   | number or range of project ID                |                                             |
| `Name`         | name                                         | On the tasks page - name of the task,<br> on the project page - name of the project |
| `Project name` | project name                                 | Specified when creating a project, <br>can be changed on the ({{< ilink "/docs/manual/advanced/projects" "project section" >}}) |

---

Push `Open` button to go to {{< ilink "/docs/manual/basics/task-details" "task details" >}}.

[create-filter]: /docs/manual/advanced/filter/#create-a-filter
[operators]: /docs/manual/advanced/filter/#supported-operators-for-properties
[groups]: /docs/manual/advanced/filter/#groups
[data-and-time]: /docs/manual/advanced/filter#date-and-time-selection
[sorting]: /docs/manual/advanced/filter/#sort-by
[quick-filters]: /docs/manual/advanced/filter/#quick-filters
