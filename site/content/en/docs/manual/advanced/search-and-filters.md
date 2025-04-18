---
title: 'Search and filters'
linkTitle: 'Search and filters'
weight: 2
description: 'Overview of available search options.'
---

## Search, sort and filter lists

On the {{< ilink "/docs/manual/advanced/projects#projects-page" "projects" >}}, task list on the project page,
{{< ilink "/docs/manual/basics/tasks-page" "tasks" >}}, {{< ilink "/docs/manual/basics/jobs-page" "jobs" >}},
and {{< ilink "/docs/manual/basics/cloud-storages" "cloud storage" >}} pages, you can use search, sorting and filters.

> The applied search, filter and sorting will be displayed in the URL of your browser,
> Thus, you can share the page with applied parameters.

### Search

Search within all fields (owner, assignee, task name, task status, task mode).
To execute enter a search string in search field.

The search is case insensitive.

![](/images/search-bar.png)


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
