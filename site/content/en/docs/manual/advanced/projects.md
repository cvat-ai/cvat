---
title: 'Projects'
linkTitle: 'Projects'
weight: 1
description: 'Creating and exporting projects in CVAT.'
---

### Create project

At CVAT, you can create a project containing tasks of the same type.
All tasks related to the project will inherit a list of labels.

To create a project, go to the projects section by clicking on the `Projects` item in the top menu.
On the projects page, you can see a list of projects, use a search,
or create a new project by clicking `Create New Project`.

![](/images/image190.jpg)

You can change: the name of the project, the list of labels
(which will be used for tasks created as parts of this project) and a link to the issue.

![](/images/image191.jpg)

Once created, the project will appear on the projects page. To open a project, just click on it.

![](/images/image192_mapillary_vistas.jpg)

Here you can do the following:

1. Change the project's title.
1. Open the `Actions` menu. Each button is responsible for a specific function in the `Actions` menu:
   - `Export dataset`/`Import dataset` - download/upload annotations or annotations and images in a specific format.
     More information is available in the [export/import datasets](/docs/manual/advanced/export-import-datasets/)
     section.
   - `Backup project` - make a backup of the project read more in the [backup](/docs/manual/advanced/backup/) section.
   - `Delete` - remove the project and all related tasks.
1. Change issue tracker or open issue tracker if it is specified.
1. Change labels.
   You can add new labels or add attributes for the existing labels in the `Raw` mode or the `Constructor` mode.
   You can also change the color for different labels. By clicking `Copy` you can copy the labels to the clipboard.
1. Assigned to — is used to assign a project to a person.
   Start typing an assignee's name and/or choose the right person out of the dropdown list.
1. `Tasks` — is a list of all tasks for a particular project, with the ability to search for tasks in the project.
   [Read more about search](/docs/manual/advanced/search/).

It is possible to choose a subset for tasks in the project. You can use the available options
(`Train`, `Test`, `Validation`) or set your own.
