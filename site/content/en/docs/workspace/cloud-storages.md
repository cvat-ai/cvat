---
title: 'Cloud storages page'
linkTitle: 'Cloud storages page'
weight: 22
description: 'Overview of the cloud storages page.'
---

![Cloud storage page example](/images/image227.jpg)

The cloud storages page contains elements, each of them relating to a separate cloud storage. 
Each element contains: preview, cloud storage name, provider, creation and update info, status,
`?` button for displaying the description and the actions menu.

Each button in the action menu is responsible for a specific function:
- `Update` — update this cloud storage
- `Delete` — delete cloud storage.

![Cloud storage icon](/images/cloud_storage_icon.jpg)

This preview will appear when it is impossible to get a real preview (e.g. storage is empty or
invalid credentials were used).

In the upper left corner, there is a search bar,
using which you can find the cloud storage by display name, provider, etc.
In the upper right corner, there are {{< ilink "/docs/manual/advanced/filter#sort-by" "sorting" >}},
{{< ilink "/docs/manual/advanced/filter#quick-filters" "quick filters" >}}, and filter.

## Filter

{{% alert title="Note" color="primary" %}}
Applying the filter disables the {{< ilink "/docs/manual/advanced/filter#quick-filters" "quick filters" >}}.
{{% /alert %}}

The filter works similarly to the filters for annotation,
you can create rules from [properties](#supported-properties-for-jobs-list),
{{< ilink "/docs/manual/advanced/filter#supported-operators-for-properties" "operators" >}},
and values and group rules into {{< ilink "/docs/manual/advanced/filter#groups" "groups" >}}.
For more details, consult the {{< ilink "/docs/manual/advanced/filter#create-a-filter" "filter section" >}}.
Learn more about {{< ilink "/docs/manual/advanced/filter#date-and-time-selection" "date and time selection" >}}.

To clear all filters, select `Clear filters`.

### Supported properties for cloud storages list

| Properties     | Supported values                             | Description                                 |
| -------------- | -------------------------------------------- | ------------------------------------------- |
| `ID`           | number or range of task ID                   |                                             |
| `Provider type` | `AWS S3`, `Azure`, `Google cloud`           |                                             |
| `Credentials type` | `Key & secret key`, `Account name and token`,<br> `Anonymous access`, `Key file` |     |
| `Resource name` |                                             | `Bucket name` or `container name`           |
| `Display name` |                                              | Set when creating cloud storage             |
| `Description`  |                                              | Description of the cloud storage            |
| `Owner`        | username                                     | The user who owns the project, task, or job |
| `Last updated` | last modified date and time (or value range) | The date can be entered in the `dd.MM.yyyy HH:mm` format <br>or by selecting the date in the window that appears <br>when you select the input field |

Select the `+` button to {{< ilink "/docs/manual/basics/attach-cloud-storage" "attach a new cloud storage" >}}.

