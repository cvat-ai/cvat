---
title: 'Projects'
linkTitle: 'Projects'
weight: 1
description: 'Creating and exporting projects in CVAT.'
aliases:
  - /docs/manual/advanced/projects/
---

## Projects page

On this page, you can create a new project, create a project from a backup, and also see the created projects.

In the upper left corner there is a search bar, using which you can find the project by project name, assignee etc.
In the upper right corner there are {{< ilink
 "/docs/annotation/manual-annotation/utilities/filter#sort-by" "sorting" >}},
{{< ilink "/docs/annotation/manual-annotation/utilities/filter#quick-filters" "quick filters" >}} and filter.

## Filter

{{% alert title="Note" color="primary" %}}
Applying a filter disables the {{< ilink
 "/docs/annotation/manual-annotation/utilities/filter#quick-filters" "quick filters" >}}.
{{% /alert %}}

The filter works similarly to the filters for annotation,
you can create rules from [properties](#supported-properties-for-projects-list),
{{< ilink "/docs/annotation/manual-annotation/utilities/filter#supported-operators-for-properties" "operators" >}}
and values and group rules into
{{< ilink "/docs/annotation/manual-annotation/utilities/filter#groups" "groups" >}}.
For more details, see the {{< ilink
 "/docs/annotation/manual-annotation/utilities/filter#create-a-filter" "filter section" >}}.
Learn more about {{< ilink
 "/docs/annotation/manual-annotation/utilities/filter#date-and-time-selection" "date and time selection" >}}.

To clear all filters, press `Clear filters`.

### Supported properties for projects list

| Properties     | Supported values                             | Description                                 |
| -------------- | -------------------------------------------- | ------------------------------------------- |
| `Assignee`     | username                                     | Assignee is the user who is working on the project, task or job. <br>(is specified on task page) |
| `Owner`        | username                                     | The user who owns the project, task, or job |
| `Last updated` | last modified date and time (or value range) | The date can be entered in the `dd.MM.yyyy HH:mm` format <br>or by selecting the date in the window that appears <br>when you click on the input field |
| `ID`           | number or range of job ID                    |                                             |
| `Name`         | name                                         | On the tasks page - name of the task,<br> on the project page - name of the project |

## Create a project

In CVAT, you can create a project containing tasks of the same type.
All tasks related to the project will inherit a list of labels.

To create a project, go to the projects section by clicking on the `Projects` item in the top menu.
On the projects page, you can see a list of projects, use a search,
or create a new project by clicking on the `+` button and select `Create New Project`.

!["Projects" page with highlighted menu for project creation](/images/image190.jpg)

{{% alert title="Note" color="primary" %}}
Note that the project will be created in the organization that you selected at the time of creation.
Read more about {{< ilink "/docs/account_management/organization" "organizations" >}}.
{{% /alert %}}

You can change: the name of the project, the list of labels
(which will be used for tasks created as parts of this project) and a skeleton if it's necessary.
In advanced configuration also you can specify: a link to the issue, source and target storages.
Learn more about {{< ilink "/docs/workspace/tasks-page#labels" "creating a label list" >}},
{{< ilink "/docs/annotation/manual-annotation/shapes/skeletons" "creating the skeleton" >}} and
{{< ilink "/docs/workspace/attach-cloud-storage" "attach cloud storage" >}}.

To save and open a project, click on `Submit & Open` button. Also, you
can click on `Submit & Continue` button to create several projects in sequence.

!["Create a new project" window with options and parameters](/images/image191.jpg)

Once created, the project will appear on the projects page. To open a project, just click on it.

![Example of a project page with project details and highlighted interface elements](/images/image192_mapillary_vistas.jpg)

Here you can do the following:

1. Change the project's title.
1. Open the `Actions` menu. Each button is responsible for a specific function in the `Actions` menu:
   - `Export dataset`/`Import dataset` - download/upload annotations or annotations and images in a specific format.
     See more information at {{< ilink "/docs/dataset_management/import-datasets" "export/import datasets" >}}.
   - `Backup project` - make a backup of the project read more in the
     {{< ilink "/docs/dataset_management/backup" "backup" >}} section.
   - `Organization` - move the project between your personal workspace or organizations.
     Please, refer to the
     {{< ilink
     "/docs/account_management/organization#transfer-tasks-and-projects-between-organizations"
     "Transfer between organizations" >}}
     section for details.
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
   {{< ilink "/docs/workspace/search.md" "Read more about search" >}}.
   {{< ilink "/docs/annotation/manual-annotation/utilities/filter#sort-and-filter-projects-tasks-and-jobs"
     "Read more about sorting and filter" >}}
It is possible to choose a subset for tasks in the project. You can use the available options
(`Train`, `Test`, `Validation`) or set your own.

