---
title: 'Jobs page'
linkTitle: 'Jobs page'
weight: 3
---

On the jobs page, users (for example, with the worker role)
can see the jobs that are assigned to them without having access to the task page,
as well as track progress, sort and apply filters to the job list.

![](/images/image243_detrac.jpg)

On the job page there is a list of jobs presented in the form of tiles, where each tile is one job.
Each element contains:
    - job ID
    - dimension 2D or 3D
    - preview
    - stage and state [see vocabulary section](/docs/manual/basics/vocabulary)
    - when hovering over an element, you can see:
        - size
        - assignee
    - menu to navigate to a task, project, or bug tracker.

In the upper right corner there is a search bar, using which you can find the job by designated user, stage, state, etc.
In the upper left corner there are sorting and filtering tools.

## Sort by

You can sort the jobs by the following parameters:
    - `ID` - ID Jobs
    - `Assignee` - the user to whom the job is assigned
    - `Updated date` - time and date of last saved job
    - `Stage` - stage set on the task page
    - `State` - state set by a user assigned to the job
    - `Task ID` - the ID of the task to which the job belongs
    - `Project ID` - the ID of the project containing the task to which the job belongs.
    - `Task name` - the name of the task to which the job belongs
    - `Project name` - the name of the project containing the task to which the job belongs.

To apply sorting, drag the parameter to the top area above the horizontal bar.
The parameters below the horizontal line will not be applied.
By moving the parameters you can change the priority,
first of all sorting will occur according to the parameters that are above.

Pressing the `Sort button` switches `Ascending sort`/`Descending sort`.

## Quick filters

Quick Filters contain several frequently used filters:
- `Assigned to me` - show only those jobs that are assigned to you.
- `Not completed` - show only those jobs that have a status other than completed.

## Filter

> Applying filter disables the quick filter.

The filter works similarly to the filters for annotation,
you can create rules from [properties](#supported-properties-for-jobs-list),
[operators](/docs/manual/advanced/filter/#supported-operators-for-properties)
and values and group rules into [groups](/docs/manual/advanced/filter/#groups).
For more details, see the [filter section](/docs/manual/advanced/filter#create-a-filter).

For clear all filters press `Clear filters`.

### Supported properties for jobs list

| Properties     | Supported values                             | Description                                 |
| -------------- | -------------------------------------------- | ------------------------------------------- |
| `State`        | all the state names                          | The state of the job <br>(can be changed in the menu inside the job) |
| `Stage`        | all the stage names                          | The stage of the job <br>(is specified by a drop-down list on the task page) |
| `Dimension`    | `2D` or `3D`                                 | Depends on the data format <br>(read more in [creating an annotation task](/docs/manual/basics/creating_an_annotation_task)) |
| `Assignee`     | username                                     | Assignee is the user who is working on the job. <br>(is specified on task page) |
| `Last updated` | last modified date and time (or value range) | The date can be entered in the `dd.MM.yyyy HH:mm` format <br>or by selecting the date in the window that appears <br>when you click on the input field |
| `ID`           | number or range of job ID                    |                                             |
| `Task ID`      | number or range of task ID                   |                                             |
| `Project ID`   | number or range of project ID                |                                             |
| `Task name`    | task name                                    | Set when creating a task, <br>can be changed on the ([task page](/docs/manual/basics/task-details/)) |
| `Project name` | project name                                 | Specified when creating a project, <br>can be changed on the ([project section](/docs/manual/advanced/projects/)) |

### Date and time selection

When creating a `Last updated` rule, you can select the date and time by using the selection window.

![](/images/image244_detrac.jpg)

You can select the year and month using the arrows or by clicking on the year and month,
to select a day, click on it in the calendar,
To select the time, you can select the hours and minutes using the scrolling list.
Or you can select the current date and time by clicking the `Now` button.
To apply, click `Ok`.
