---
title: 'Filter'
linkTitle: 'Filter'
weight: 24
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
| `Occluded`   | true or false                                          | occluded ({{< ilink "/docs/manual/advanced/shape-mode-advanced" "read more" >}}) |
| `Width`      | number of px or field                                  | shape width                                 |
| `Height`     | number of px or field                                  | shape height                                |
| `ServerID`   | number or field                                        | ID of the object on the server <br>(You can find out by forming a link to the object through the Action menu) |
| `ObjectID`   | number or field                                        | ID of the object in your client <br>(indicated on the objects sidebar) |
| `Attributes` | some other fields including attributes with a <br>similar type or a specific attribute value | any fields specified by a label |

- {{< ilink "/docs/manual/advanced/projects#supported-properties-for-projects-list"
    "Supported properties for projects list" >}}

- {{< ilink "/docs/manual/basics/tasks-page#supported-properties-for-tasks-list"
    "Supported properties for tasks list" >}}

- {{< ilink "/docs/manual/basics/jobs-page#supported-properties-for-jobs-list"
    "Supported properties for jobs list" >}}

- {{< ilink "/docs/manual/basics/cloud-storages#supported-properties-for-cloud-storages-list"
    "Supported properties for cloud storages list" >}}

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

On the {{< ilink "/docs/manual/advanced/projects#projects-page" "projects" >}}, task list on the project page,
{{< ilink "/docs/manual/basics/tasks-page" "tasks" >}}, {{< ilink "/docs/manual/basics/jobs-page" "jobs" >}},
and {{< ilink "/docs/manual/basics/cloud-storages" "cloud storage" >}} pages, you can use sorting and filters.

> The applied filter and sorting will be displayed in the URL of your browser,
> Thus, you can share the page with sorting and filter applied.

### Sort by

You can sort by the following parameters:
- Jobs list: ID, assignee, updated date, [stage][stage], [state][state], task ID, project ID,
task name, project name.
- Tasks list or tasks list on project page: ID, owner, status, assignee, updated date, [subset][subset], [mode][mode],
[dimension][dimension], project ID, name, project name.
- Projects list: ID, assignee, owner, status, name, updated date.
- Cloud storages list: ID, provider type, updated date, display name, [resource][resource],
[credentials][credentials], owner, description.

To apply sorting, drag the parameter to the top area above the horizontal bar.
The parameters below the horizontal line will not be applied.
By moving the parameters you can change the priority,
first of all sorting will occur according to the parameters that are above.

Pressing the `Sort button` switches `Ascending sort`/`Descending sort`.

### Quick filters

Quick Filters contain several frequently used filters:
- `Assigned to me` - show only those projects, tasks or jobs that are assigned to you.
- `Owned by me` -  show only those projects or tasks that are owned by you.
- `Not completed` - show only those projects, tasks or jobs that have a status other than completed.
- `AWS storages` - show only AWS cloud storages
- `Azure storages` - show only Azure cloud storages
- `Google cloud storages` - show only Google cloud storages

#### Date and time selection

When creating a `Last updated` rule, you can select the date and time by using the selection window.

![](/images/image244_detrac.jpg)

You can select the year and month using the arrows or by clicking on the year and month.
To select a day, click on it in the calendar,
To select the time, you can select the hours and minutes using the scrolling list.
Or you can select the current date and time by clicking the `Now` button.
To apply, click `Ok`.

[state]: /docs/manual/basics/vocabulary/#state
[stage]: /docs/manual/basics/vocabulary/#stage
[subset]: /docs/manual/basics/vocabulary/#subset
[resource]: /docs/manual/basics/vocabulary/#resource
[credentials]: /docs/manual/basics/vocabulary/#credentials
[mode]: /docs/manual/basics/vocabulary/#mode
[dimension]: /docs/manual/basics/vocabulary/#dimension
