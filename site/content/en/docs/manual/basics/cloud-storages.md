---
title: 'Cloud storages page'
linkTitle: 'Cloud storages page'
weight: 22
description: 'Overview of the cloud storages page.'
---

![](/images/image227.jpg)

The cloud storages page contains elements, each of them relating to a separate cloud storage. 
Each element contains: preview, cloud storage name, provider, creation and update info, status,
`?` button for displaying the description and the actions menu.

Each button in the action menu is responsible for a specific function:
- `Update` — update this cloud storage
- `Delete` — delete cloud storage.

![](/images/cloud_storage_icon.jpg)

This preview will appear when it is impossible to get a real preview (e.g. storage is empty or
invalid credentials were used).

In the upper left corner there is a search bar,
using which you can find the cloud storage by display name, provider, etc.
In the upper right corner there are [sorting][sorting], [quick filters][quick-filters] and filter.

## Filter

> Applying filter disables the [quick filter][quick-filters].

The filter works similarly to the filters for annotation,
you can create rules from [properties](#supported-properties-for-jobs-list),
[operators][operators] and values and group rules into [groups][groups].
For more details, see the [filter section][create-filter].
Learn more about [date and time selection][data-and-time].

For clear all filters press `Clear filters`.

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
| `Last updated` | last modified date and time (or value range) | The date can be entered in the `dd.MM.yyyy HH:mm` format <br>or by selecting the date in the window that appears <br>when you click on the input field |

Click the `+` button to {{< ilink "/docs/manual/basics/attach-cloud-storage" "attach a new cloud storage" >}}.

[create-filter]: /docs/manual/advanced/filter/#create-a-filter
[operators]: /docs/manual/advanced/filter/#supported-operators-for-properties
[groups]: /docs/manual/advanced/filter/#groups
[data-and-time]: /docs/manual/advanced/filter#date-and-time-selection
[sorting]: /docs/manual/advanced/filter/#sort-by
[quick-filters]: /docs/manual/advanced/filter/#quick-filters
