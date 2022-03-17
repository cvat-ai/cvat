---
title: 'Filter'
linkTitle: 'Filter'
weight: 23
description: 'Guide to using the Filter feature in CVAT.'
---

There are some reasons to use the feature:

1. When you use a filter, objects that don't match the filter will be hidden.
1. The fast navigation between frames which have an object of interest.
   Use the `Left Arrow` / `Right Arrow` keys for this purpose
   or customize the UI buttons by right-clicking and select `switching by filter`.
   If there are no objects which correspond to the filter,
   you will go to the previous / next frame which contains any annotated objects.

To apply filters you need to click on the button on the top panel.

![](/images/image059.jpg)

## Create a filter

It will open a window for filter input. Here you will find two buttons: `Add rule` and `Add group`.

![](/images/image202.jpg)

### Rules

The `Add rule` button adds a rule for objects display. A rule may use the following properties:

![](/images/image204.jpg)

### Supported properties for annotation

| Properties   | Supported values                                       | Description                                 |
| ------------ | ------------------------------------------------------ | ------------------------------------------- |
| `Label`      | all the label names that are in the task               | label name                                  |
| `Type`       | shape, track or tag                                    | type of object                              |
| `Shape`      | all shape types                                        | type of shape                               |
| `Occluded`   | true or false                                          | occluded ([read more](/docs/manual/advanced/shape-mode-advanced/)) |
| `Width`      | number of px or field                                  | shape width                                 |
| `Height`     | number of px or field                                  | shape height                                |
| `ServerID`   | number or field                                        | ID of the object on the server <br>(You can find out by forming a link to the object through the Action menu) |
| `ObjectID`   | number or field                                        | ID of the object in your client <br>(indicated on the objects sidebar) |
| `Attributes` | some other fields including attributes with a <br>similar type or a specific attribute value | any fields specified by a label |

### Supported properties for lists

| Properties     | Supported values                             | Description                                 |
| -------------- | -------------------------------------------- | ------------------------------------------- |
| `State`        | all the state names                          | The state of the job <br>(can be changed in the menu inside the job) |
| `Stage`        | all the stage names                          | The stage of the job <br>(is specified by a drop-down list on the task page) |
| `Dimension`    | `2D` or `3D`                                 | Depends on the data format <br>(read more in [creating an annotation task](/docs/manual/basics/creating_an_annotation_task)) |
| `Assignee`     | username                                     | Assignee is the user who is working on the project, task or job. <br>(is specified on task page) |
| `Owner`        | username                                     | The user who owns the project, task, or job |
| `Last updated` | last modified date and time (or value range) | The date can be entered in the `dd.MM.yyyy HH:mm` format <br>or by selecting the date in the window that appears <br>when you click on the input field |
| `Status`       | `annotation`, `validation` or `completed`    |                                             |
| `Data`         | `video`, `images`                            | Depends on the data format <br>(read more in [creating an annotation task](/docs/manual/basics/creating_an_annotation_task)) |
| `Subset`       | `test`, `train`, `validation` or custom subset |                                           |
| `ID`           | number or range of job ID                    |                                             |
| `Name`         | name                                         | On the tasks page - name of the task,<br> on the project page - name of the project |
| `Task ID`      | number or range of task ID                   |                                             |
| `Project ID`   | number or range of project ID                |                                             |
| `Task name`    | task name                                    | Set when creating a task, <br>can be changed on the ([task page](/docs/manual/basics/task-details/)) |
| `Project name` | project name                                 | Specified when creating a project, <br>can be changed on the ([project section](/docs/manual/advanced/projects/)) |
| `Provider type` | `AWS S3`, `Azure`, `Google cloud`           |                                             |
| `Credentials type` | `Key & secret key`, `Account name and token`,<br> `Anonymous access`, `Key file` |     |
| `Description`  |                                              | Description of the cloud storage            |
| `Resource name` |                                             | `Bucket name` or `container name`           |
| `Display name` |                                              | Set when creating cloud storage             |

### Supported operators for properties

`==` - Equally; `!=` - Not equal; `>` - More; `>=` - More or equal; `<` - Less; `<=` - Less or equal;

`Any in`; `Not in` - these operators allow you to set multiple values in one rule;

![](/images/image203.jpg)

`Is empty`; `is not empty` – these operators don't require to input a value.

`Between`; `Not between` – these operators allow you to choose a range between two values.

`Like` - this operator indicate that the property must contain a value.

`Starts with`; `Ends with` - filter by beginning or end.

Some properties support two types of values that you can choose:

![](/images/image205.jpg)

You can add multiple rules, to do so click the add rule button and set another rule.
Once you've set a new rule, you'll be able to choose which operator they will be connected by: `And` or `Or`.

![](/images/image206.jpg)

All subsequent rules will be joined by the chosen operator.
Click `Submit` to apply the filter or if you want multiple rules to be connected by different operators, use groups.

### Groups

To add a group, click the `Add group` button. Inside the group you can create rules or groups.

![](/images/image207.jpg)

If there is more than one rule in the group, they can be connected by `And` or `Or` operators.
The rule group will work as well as a separate rule outside the group and will be joined by an
operator outside the group.
You can create groups within other groups, to do so you need to click the add group button within the group.

You can move rules and groups. To move the rule or group, drag it by the button.
To remove the rule or group, click on the `Delete` button.

![](/images/image208.jpg)

If you activate the `Not` button, objects that don't match the group will be filtered out.
Click `Submit` to apply the filter.
The `Cancel` button undoes the filter. The `Clear filter` button removes the filter.

Once applied filter automatically appears in `Recent used` list. Maximum length of the list is 10.

---

## Sort and filter lists

On the [projects](/docs/manual/advanced/projects/#projects-page), task list on the project page,
[tasks](/docs/manual/basics/tasks-page/), [jobs](/docs/manual/basics/jobs-page/),
and [cloud storage](/docs/manual/basics/cloud-storages/) pages, you can use sorting and filters.

> The applied filter and sorting will be displayed in the URL of your browser,
> Thus, you can share the page with the filter applied.

### Sort by

You can sort the project, task or job by the following parameters:
- `ID` - ID project, task or job
- `Assignee` - the user to whom the project, task or job is assigned
- `Owner` - the user who owns the project, task, or job
- `Status` - sort by status (`annotation`, `validation` or `completed`)
- `Updated date` - time and date of last saved project, task or job
- `Stage` - stage set on the task page
- `State` - state set by a user assigned to the job
- `Subset` - sort by subset (`test`, `train`, `validation` or custom subset
)
- `Mode` - sort by mode (`interpolation - video` or `annotation - images`)
- `Dimension` - sort by dimension `2D` and `3D`,
  read more in [creating an annotation task](/docs/manual/basics/creating_an_annotation_task)
- `Task ID` - the ID of the task to which the job belongs
- `Project ID` - the ID of the project containing the task to which the job belongs.
- `Name` - name of task or project
- `Task name` - the name of the task to which the job belongs
- `Project name` - the name of the project containing the task or the task to which the job belongs.
- `Provider type` - sort by provider (`AWS S3`, `Azure`, `Google cloud`)
- `Credentials` - sort by credentials (`Key & secret key`, `Account name and token`, `Anonymous access`, `Key file`)
- `Description` - sort by description
- `Resource` - sort by resource (`bucket name` or `container name`)
- `Display name` - sort by display name

To apply sorting, drag the parameter to the top area above the horizontal bar.
The parameters below the horizontal line will not be applied.
By moving the parameters you can change the priority,
sorting will occur according to the order of parameters, starting from the top.

Pressing the `Sort button` switches between `Ascending sort`/`Descending sort`.

### Quick filters

Quick Filters contain several frequently used filters:
- `Assigned to me` - show only those projects, tasks or jobs that are assigned to you.
- `Owned by me` -  show only those projects or tasks that are owned by you.
- `Not completed` - show only those projects, tasks or jobs that have a status other than completed.
- `AWS storages` - show only AWS cloud storages
- `Azure storages` - show only Azure cloud storages
- `Google cloud storages` - show only Google cloud storages

### Filter

> Applying filter disables the quick filter.

The filter works similarly to the filters for annotation,
you can create rules from [properties](#supported-properties-for-lists),
[operators](#supported-operators-for-properties)
and values and group rules into [groups](#groups).
For more details, see the [filter section](#create-a-filter).

To clear all filters press `Clear filters`.

#### Date and time selection

When creating a `Last updated` rule, you can select the date and time by using the selection window.

![](/images/image244_detrac.jpg)

You can select the year and month using the arrows or by clicking on the year and month.
To select a day, click on it in the calendar,
To select the time, you can select the hours and minutes using the scrolling list.
Or you can select the current date and time by clicking the `Now` button.
To apply, click `Ok`.
