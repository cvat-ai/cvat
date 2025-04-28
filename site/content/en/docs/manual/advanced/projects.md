---
title: 'Projects page'
linkTitle: 'Projects page'
weight: 1
description: 'Creating and exporting projects in CVAT.'
---

## Projects page

On this page you can create a new project, create a project from a backup, and also see the created projects.

In the upper left corner there is a search bar, using which you can find the project by project name, assignee etc.
In the upper right corner there are [sorting][sorting], [quick filters][quick-filters] and filter.

## Filter

> Applying filter disables the [quick filter][quick-filters].

The filter works similarly to the filters for annotation,
you can create rules from [properties](#supported-properties-for-projects-list),
[operators][operators] and values and group rules into [groups][groups].
For more details, see the [filter section][create-filter].
Learn more about [date and time selection][data-and-time].

For clear all filters press `Clear filters`.

### Supported properties for projects list

| Properties     | Supported values                             | Description                                 |
| -------------- | -------------------------------------------- | ------------------------------------------- |
| `Assignee`     | username                                     | Assignee is the user who is working on the project, task or job. <br>(is specified on task page) |
| `Owner`        | username                                     | The user who owns the project, task, or job |
| `Last updated` | last modified date and time (or value range) | The date can be entered in the `dd.MM.yyyy HH:mm` format <br>or by selecting the date in the window that appears <br>when you click on the input field |
| `ID`           | number or range of job ID                    |                                             |
| `Name`         | name                                         | On the tasks page - name of the task,<br> on the project page - name of the project |

## Create a project

At CVAT, you can create a project containing tasks of the same type.
All tasks related to the project will inherit a list of labels.

To create a project, go to the projects section by clicking on the `Projects` item in the top menu.
On the projects page, you can see a list of projects, use a search,
or create a new project by clicking on the `+` button and select `Create New Project`.

![](/images/image190.jpg)

> Note that the project will be created in the organization that you selected at the time of creation.
> Read more about {{< ilink "/docs/manual/advanced/organization" "organizations" >}}.

You can change: the name of the project, the list of labels
(which will be used for tasks created as parts of this project) and a skeleton if it's necessary.
In advanced configuration also you can specify: a link to the issue, source and target storages.
Learn more about {{< ilink "/docs/manual/basics/create_an_annotation_task#labels" "creating a label list" >}},
{{< ilink "/docs/manual/advanced/skeletons" "creating the skeleton" >}} and
{{< ilink "/docs/manual/basics/attach-cloud-storage" "attach cloud storage" >}}.

To save and open project click on `Submit & Open` button. Also you
can click on `Submit & Continue` button for creating several projects in sequence

![](/images/image191.jpg)

Once created, the project will appear on the projects page. To open a project, just click on it.

![](/images/image192_mapillary_vistas.jpg)

Here you can do the following:

1. Change the project's title.
1. Open the `Actions` menu. Each button is responsible for a specific function in the `Actions` menu:
   - `Export dataset`/`Import dataset` - download/upload annotations or annotations and images in a specific format.
     More information is available in the {{< ilink "/docs/manual/advanced/import-datasets" "export/import datasets" >}}
     section.
   - `Backup project` - make a backup of the project read more in the
     {{< ilink "/docs/manual/advanced/backup" "backup" >}} section.
   - `Delete` - remove the project and all related tasks.
1. Change issue tracker or open issue tracker if it is specified.
1. Change labels and skeleton.
   You can add new labels or add attributes for the existing labels in the `Raw` mode or the `Constructor` mode.
   You can also change the color for different labels.
   By clicking `Setup skeleton` you can create a skeleton for this project.

1. Assigned to — is used to assign a project to a person.
   Start typing an assignee's name and/or choose the right person out of the dropdown list.
1. `Tasks` — is a list of all tasks for a particular project, with the ability to search,
   sort and filter for tasks in the project.
   {{< ilink "/docs/manual/advanced/search" "Read more about search" >}}.
   {{< ilink "/docs/manual/advanced/filter#sort-and-filter-projects-tasks-and-jobs"
     "Read more about sorting and filter" >}}
It is possible to choose a subset for tasks in the project. You can use the available options
(`Train`, `Test`, `Validation`) or set your own.

[create-filter]: /docs/manual/advanced/filter/#create-a-filter
[operators]: /docs/manual/advanced/filter/#supported-operators-for-properties
[groups]: /docs/manual/advanced/filter/#groups
[data-and-time]: /docs/manual/advanced/filter#date-and-time-selection
[sorting]: /docs/manual/advanced/filter/#sort-by
[quick-filters]: /docs/manual/advanced/filter/#quick-filters
