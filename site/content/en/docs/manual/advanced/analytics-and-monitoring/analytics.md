---
title: 'Analytics'
linkTitle: 'Analytics'
weight: 3
# description: 'Analytics in CVAT'
---

CVAT provides analytics data for projects, tasks, and jobs.
You can use analytics to track the annotation progress and statistics
for a project in general, and for a task or a job individually.

Analytics is a paid feature that available for paid tiers in CVAT Online
and for CVAT Enterprise users.

For personal workspaces, analytics are available for the workspace owners only.
Within an {{< ilink "/docs/manual/advanced/organization" "organization">}},
analytics availability is tied to the {{< ilink "/docs/manual/advanced/user-roles#organization-roles-in-cvat" "user organization role" >}}:
* **Owners** and **Maintainers** can access the full analytics for any project, task, or job.
* **Supervisers**
* **Workers** can access the analytics only for the tasks and jobs they are assigned to.

## Access

To open analytics:

{{< tabpane text=true >}}

{{% tab header="For a project" %}}

1. Open **Projects**
1. In the project list, open a project menu using ![Open menu](/images/openmenu.jpg)
   or open a project and select **Actions**
1. Select **View analytics**

{{% /tab %}}

{{% tab header="For a task" %}}

1. Open **Tasks**
1. In the task list, open **Actions** menu for a task. Or open a task and select **Actions**
1. Select **View analytics**

{{% /tab %}}

{{% tab header="For a job" %}}

1. Open **Jobs**
1. In the jobs list, open a job menu using ![Open menu](/images/openmenu.jpg)
1. Select **View analytics**

{{% /tab %}}

{{< /tabpane >}}

## Analytics page

The **Analytics** page displays the data relevant to the specific project, task, or job.
Use the link in the page title to open the corresponding project, task, or job.

Analytics data is fetched only manually, so when you open the **Analytics** page
the first time it is empty. To fetch and display the analytical data, select **Request**
button.

Once the data is fetched and displayed on the page, you can check its relevance under the page title.

To update the data, select ![Fetch analytics button](/images/analytics/fetch-data-button.png) button.

> **Note**: the date filter is applied to the [**Events** tab](#events-tab) only.

**Export events** button => ?.

### Summary tab

The **Summary** tab displays the quantative metrics:
- **Objects diff** is the difference between the created and deleted objects in the project, task, or job.
- **Total working time** is the time in hours spent on the project, task, or job across all users.
  The time is calculated based on the project events, such as creating annotations, and so on.
- **Avg. annotation speed** is the average number of the objects annotated per hour.

The **Summary** tab also shows graphs for the objects summary and the annotation speed, and the diagrams for
the annotation distribution by labels and types. Hover over a graph or a diagram to display the tooltip.

### Annotations tab

The **Annotations** tab contains the annotations data and statistics.

The **Detection** tab contains a table with data related to the
annotations made in {{< ilink "/docs/manual/basics/shape-mode-basics" "shape mode">}}:

<!--lint disable maximum-line-length-->

- **Label ID** is the ID of the label.
- **Label name** is the name of the label.
- columns with {{< ilink "/docs/manual/basics/types-of-shapes" "label types">}}
  indicate the number of objects with the corresponding label type.
- **Total shapes** is the total number of all label shapes.

<!--lint enable maximum-line-length-->

The **Tracking** tab contains a table with data related to the
annotations made in {{< ilink "/docs/manual/basics/track-mode-basics" "track mode">}}:

<!--lint disable maximum-line-length-->

| **Column name**        | **Content**                                                                                                                             |
|------------------------|---------------------------------------------------------------------------------------------------------------------------------------------|
| **Label ID**           | The ID of the label.                                                                                                                        |
| **Label name**         | The name of the label.                                                                                                                      |
| Columns with {{< ilink "/docs/manual/basics/types-of-shapes" "label type names">}}            |  Indicate the number of objects with the corresponding label type. |
| **Keyframes**          | The number of the label keyframes.                                                                                                          |
| **Interpolated**       | The number of {{< ilink "/docs/manual/basics/vocabulary#interpolation" "interpolated frames" >}} with the label.                           |
| **Tracks**             | The number of the label {{< ilink "/docs/manual/basics/vocabulary#track" "tracks" >}}.                                                     |
| **Total objects**      | The total number of all label objects.                                                                                                      |

<!--lint enable maximum-line-length-->

### Events tab

The **Events** tab displays the following metrics (respecting the date filter):
- **Total objects** is the total number of objects in the project jobs
- **Total images** is the total number of images in the project jobs
- **Total working time** is the time in hours spent on the project across all users.
    This is the same metric as on the **Summary** tab.
- **Avg. annotation speed** is the average number of the project objects annotated per hour.
    This is the same metric as on the **Summary** tab.

You can filter the events by date range:
1. Select the date picker near the page title
1. In the calendar, select the first and the last day of date range.
   Or enter the dates manually in format `YYYY-MM-DD`.

If the date filter is empty, the **Events** tab shows the metrics and events
for all time period of the project, task, job.

To reset the date range, select ![Clear filter button](/images/analytics/clear-filter-button.png) button in the date picker.

You can also filter the table entries by values in **Task name**, **Assignee**, **Stage**, **State**, **User** columns:
1. In the search box, enter the value or part of the value to find
1. Select ![Search button](/images/analytics/search-button.png) button or press *Enter*

The events table columns:

<!--lint disable maximum-line-length-->

| **Column name**     | **Content**                                                                                      |
|---------------------|------------------------------------------------------------------------------------------------------|
| **Task ID**         | The ID of the task. If the task exists (**Exists** column has value `true`), you can select the value to open the task. |
| **Task name**       | The task name. By default, the column is hidden. Select the value to open the task.                 |
| **Job ID**          | The ID of the job. If the job exists (**Exists** column has value `true`), you can select the value to open the job.                                                 |
| **Type**            | The type of the event. Possible values:                                                              |
| **Frame Count**     |                                                                                                      |
| **Exists**          | Indicates if the job (**Job ID**) or the task (**Task ID** / **Task name**) exists at the last data fetch. |
| **Objects**         |                                                                                                      |
| **Assignee**        | The job (**Job ID**) assignee.                                                                       |
| **Stage**           | The stage of the job in the **Job ID** column.                                                       |
| **State**           | The state of the job in the **Job ID** column.                                                       |
| **User**            |                                                                                                      |
| **Working time**    | Displays the total time spent during the event (in seconds?). By default, the column is hidden.     |
| **Start UTC time**  | The Coordinated Universal Time (UTC) when the event was started.                                     |
| **End UTC time**    | The Coordinated Universal Time (UTC) when the event was finished. By default, the column is hidden. |
| **Created objects** | The total number of created objects. By default, the column is hidden.                              |
| **Updated objects** | The total number of updated objects. By default, the column is hidden.                              |
| **Deleted objects** | The total number of deleted objects. By default, the column is hidden.                              |

<!--lint enable maximum-line-length-->

## Working with tables

To export an analytics table as a CSV file, select ![Export button](/images/analytics/export-button.png) button.

To filter the table entries by other rule, select **Filter** and set criterias for the filtering.
To learn more about how to set a filter, refer to the **{{< ilink "/docs/manual/advanced/filter" "Filter" >}}**
article.

To reset all applied filters, select **Clear filters**.

To manage the table columns:
1. Select above the right side of the table
1. Select the checkboxes for the columns to display them in the table,
   or unselect them to hide the corresponding columns

> **Note:** the applied filters and visible columns do not affect the exported file.
> It always contains the complete table with all columns and rows.

You can sort the table entries by a column values. Select the column name to apply sorting.
The arrows near the column name indicate the applied sorting order. The arrow up indicates
acsending order, the arrow down indicates descending order.

You can sort the entries by one column only.

Large tables are divided by pages. There are pagination controls under the table.
You can change the number of entries per page.
