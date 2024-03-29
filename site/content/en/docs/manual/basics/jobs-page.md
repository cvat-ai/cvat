---
title: 'Jobs page'
linkTitle: 'Jobs page'
weight: 4
---

On the jobs page, users (for example, with the worker role)
can see the jobs that are assigned to them without having access to the task page,
as well as track progress, sort and apply filters to the job list.

![](/images/image243_detrac.jpg)

On the job page there is a list of jobs presented in the form of tiles, where each tile is one job.
Each element contains:
- job ID
- dimension `2D` or `3D`
- preview
- [stage][stage] and [state][state]
- when hovering over an element, you can see:
  - size
  - assignee
- menu to navigate to a task, project, or bug tracker.

> To open the job in a new tab, click on the job by holding `Ctrl`.

In the upper left corner there is a search bar, using which you can find the job by assignee, stage, state, etc.
In the upper right corner there are [sorting][sorting], [quick filters][quick-filters] and filter.

## Filter

> Applying filter disables the [quick filter][quick-filters].

The filter works similarly to the filters for annotation,
you can create rules from [properties](#supported-properties-for-jobs-list), [operators][operators]
and values and group rules into [groups][groups]. For more details, see the [filter section][create-filter].
Learn more about [date and time selection][data-and-time].

For clear all filters press `Clear filters`.

### Supported properties for jobs list

| Properties     | Supported values                             | Description                                 |
| -------------- | -------------------------------------------- | ------------------------------------------- |
| `State`        | all the state names                          | The state of the job <br>(can be changed in the menu inside the job) |
| `Stage`        | all the stage names                          | The stage of the job <br>(is specified by a drop-down list on the task page) |
| `Dimension`    | `2D` or `3D`                                 | Depends on the data format <br>(read more in [creating an annotation task][create-task]) |
| `Assignee`     | username                                     | Assignee is the user who is working on the job. <br>(is specified on task page) |
| `Last updated` | last modified date and time (or value range) | The date can be entered in the `dd.MM.yyyy HH:mm` format <br>or by selecting the date in the window that appears <br>when you click on the input field |
| `ID`           | number or range of job ID                    |                                             |
| `Task ID`      | number or range of task ID                   |                                             |
| `Project ID`   | number or range of project ID                |                                             |
| `Task name`    | task name                                    | Set when creating a task, <br>can be changed on the ({{< ilink "/docs/manual/basics/task-details" "task page" >}}) |
| `Project name` | project name                                 | Specified when creating a project, <br>can be changed on the ({{< ilink "/docs/manual/advanced/projects" "project section" >}}) |

[state]: /docs/manual/basics/vocabulary/#state
[stage]: /docs/manual/basics/vocabulary/#stage
[create-task]: /docs/manual/basics/create_an_annotation_task
[create-filter]: /docs/manual/advanced/filter/#create-a-filter
[operators]: /docs/manual/advanced/filter/#supported-operators-for-properties
[groups]: /docs/manual/advanced/filter/#groups
[data-and-time]: /docs/manual/advanced/filter#date-and-time-selection
[sorting]: /docs/manual/advanced/filter/#sort-by
[quick-filters]: /docs/manual/advanced/filter/#quick-filters
