---
title: 'Analytics'
linkTitle: 'Analytics'
weight: 3
# description: 'Analytics dashboard for projects, tasks, and jobs'
---

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

Accessibility for users (how a user role affects the analytics):

## Analytics page

Analytics data is fetched only manually, so when you open the **Analytics** page
the first time it is empty. To fetch and display the analytical data, select **Request**
button.

Once the data is displayed on the page, you can check its relevance under the page title.

To update the data, select ![Fetch analytics button](/images/analytics/fetch-data-button.png) button.

> **Note**: the date filter is applied to the [**Events** tab](#events-tab) only.

**Export events** button => ?.

### Summary tab

For projects, the **Summary** tab displays the quantative metrics:
- **Objects diff** is the difference between the created and deleted objects across the project.
- **Total working time** is the time in hours spent on the project across all users.
  The time is calculated based on the project events, such as creating annotations, and so on.
- **Avg. annotation speed** is the average number of the project objects annotated per hour.

The **Summary** tab also provides graphs for objects, annotation speed, and the annotation distribution
by labels and types.

### Annotations tab

**Detection** tab:

- **Label ID** is the ID of the label
- **Label name** is the name of the label
- label types
- **Total shapes** is the total number of all shapes with given label

**Tracking** tab:

- **Label ID** is the ID of the label
- **Label name** is the name of the label
- label types
- **Keyframes**
- **Interpolated**
- **Tracks**
- **Total objects**

### Events tab

The **Events** tab, displays the metrics (respecting the date filter):
- **Total objects** is the total number of objects in the project jobs
- **Total images** is the total number of images in the project jobs
- **Total working time** is the time in hours spent on the project across all users.
    This is the same metric as on the **Summary** tab.
- **Avg. annotation speed** is the average number of the project objects annotated per hour.
    This is the same metric as on the **Summary** tab.

To export the events table as a CSV file, select ![Export button](/images/analytics/export-button.png) button.

You can filter the events by date range:
1. Select the date picker near the page title
1. In the calendar, select the first and the last day of date range.
   Or enter the dates manually in format `YYYY-MM-DD`.

To reset the date range, select ![Clear filter button](/images/analytics/clear-filter-button.png) button in the date picker.

You can also filter the table entries by values in **Task name**, **Assignee**, **Stage**, **State**, **User** columns:
1. In the search box, enter the value or part of the value to find
1. Select ![Search button](/images/analytics/search-button.png) button or press *Enter*

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

The table columns:

| **Column name**     | **Content**                                                                                      |
|---------------------|------------------------------------------------------------------------------------------------------|
| **Task ID**         | The ID of the task (uniqueness?). Select the value to open the task.                                |
| **Task name**       | The task name. By default, the column is hidden. Select the value to open the task.                 |
| **Job ID**          | The ID of the job. Select the value to open the job.                                                 |
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

You can sort the table entries by a column values. Select the column name to apply sorting.
The arrows near the column name indicate the applied sorting order. The arrow up indicates
acsending order, the arrow down indicates descending order.

You can sort the entries by one column only.

Large tables are divided by pages. There are pagination controls under the table.
You can change the number of entries per page.
