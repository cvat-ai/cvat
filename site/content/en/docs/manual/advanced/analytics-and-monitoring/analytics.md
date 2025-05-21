---
title: 'Analytics'
linkTitle: 'Analytics'
weight: 3
# description: 'Analytics in CVAT'
---

CVAT provides analytics data for projects, tasks, and jobs.
You can use analytics to track annotation progress and statistics for a project
as a whole or individual tasks and jobs. Analytics can help you perform tasks such as:

- Define the working time a user spent on a job during a specific period
- Track time spent in each job stage
- Calculate the total number of ground truth objects in a project
- Determine the number of ground truth images in a project
- Check interpolation rates to assess annotator efficiency
- Identify how many objects of a specific label were annotated in a resource
- Calculate the average annotation speed of a user in a project or task
- Analyze how many objects or images were present in removed resources

Analytics is a paid feature available on CVAT Online paid tiers and for CVAT Enterprise users.

For personal workspaces, analytics are available only to workspace owners.
Within an organization, access to analytics depends on the user's
{{< ilink "/docs/manual/advanced/user-roles#organization-roles-in-cvat" "organization role">}}:

- **Owners** and **Maintainers** can access full analytics for any project, task, or job.
- **Supervisors**
- **Workers** can access analytics only for the tasks and jobs they are assigned to.


## Access

To open analytics:

{{< tabpane text=true >}}

{{% tab header="For a project" %}}

1. Open **Projects**
1. In the project list, open the project menu using ![Open menu](/images/openmenu.jpg)
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
1. In the jobs list, open the job menu using ![Open menu](/images/openmenu.jpg)
1. Select **View analytics**

{{% /tab %}}

{{< /tabpane >}}

## Analytics page

The **Analytics** page displays the data relevant to the specific project, task, or job.
Use the link in the page title to return to the corresponding project, task, or job.

Analytics data is fetched only manually, so when you open the **Analytics** page for
the first time, it is empty. To fetch and display the analytical data, select the **Request**
button.

Once the data is fetched and displayed on the page, you can check its relevance under the page title.

To update the data, select ![Fetch analytics button](/images/analytics/fetch-data-button.png) button.

The **Analytics** page contains [**Summary**](#summary-tab),
[**Annotations**](#annotations-tab), [**Events**](#events) tabs, the date filter, and the
**Export events** button.

The **Summary** tab provides a statistics overview, while the **Annotations** and **Events** tabs
contain the detailed data in table form.

> **Note**: The date filter is applied only to the [**Events**](#events-tab) tab.

To download a CSV file with the extended and detailed event data, select the **Export events** button.

### Summary tab

The **Summary** tab displays the quantitative metrics:
- **Objects diff** is the difference between the created and deleted objects in the project, task, or job.
- **Total working time** is the hours spent on the project, task, or job across all users.
  The time is calculated based on the project events, such as creating annotations, and so on.
- **Avg. annotation speed** is the average number of objects annotated per hour.

The **Summary** tab also shows graphs for the objects summary and the annotation speed, and the diagrams for
the annotation distribution by labels and types. Hover over a graph or a diagram to display the tooltip.

### Annotations tab

The **Annotations** tab contains the data for annotations made in the
{{< ilink "/docs/manual/basics/shape-mode-basics" "shape mode">}} (the **Detections** tab)
and in the {{< ilink "/docs/manual/basics/track-mode-basics" "track mode">}} (the **Tracking** tab).

Both the **Detection** and **Tracking** tabs contain adjustable tables.
Learn [how to work with tables](#working-with-tables).

You can also filter the table entries by values in the **Label name** column:
1. In the search box, enter the value or part of the value to find
1. Select ![Search button](/images/analytics/search-button.png) button or press *Enter*

The table in the **Detection** tab contains the columns:

<!--lint disable maximum-line-length-->

| **Column name** | **Content** |
|-----------------|-------------|
| **Label ID** | The ID of the label. |
| **Label name** | The name of the label. |
| Columns with {{< ilink "/docs/manual/basics/types-of-shapes" "label types names">}} | The number of objects with the corresponding label type. By default, the columns with zero values are hidden. |
| **Total shapes** | The total number of all label shapes. |


<!--lint enable maximum-line-length-->

The table in the **Tracking** tab contains the columns:

<!--lint disable maximum-line-length-->

| **Column name** | **Content** |
|-----------------|-------------|
| **Label ID** | The ID of the label. |
| **Label name** | The name of the label. |
| Columns with {{< ilink "/docs/manual/basics/types-of-shapes" "label type names">}} | The number of objects with the corresponding label type. By default, the columns with zero values are hidden. |
| **Keyframes** | The number of the label keyframes. |
| **Interpolated** | The number of {{< ilink "/docs/manual/basics/vocabulary#interpolation" "interpolated frames" >}} with the label. |
| **Tracks** | The number of the label {{< ilink "/docs/manual/basics/vocabulary#track" "tracks" >}}. |
| **Total objects** | The total number of all label objects. |

<!--lint enable maximum-line-length-->

### Events tab

The **Events** tab displays the following metrics (respecting the date filter):
- **Total objects** is the total number of objects in the project jobs.
- **Total images** is the total number of images in the project jobs.
- **Total working time** is the hours spent on the project across all users.
    This is the same metric as on the **Summary** tab.
- **Avg. annotation speed** is the average number of the project objects annotated per hour.
    This is the same metric as on the **Summary** tab.

You can filter the events by date range:
1. Select the date picker near the page title
1. In the calendar, select the first and the last day of the date range.
   Or enter the dates manually in the format `YYYY-MM-DD`.

If the date filter is empty, the **Events** tab shows the metrics and events
for the lifetime of the project, task, or job.

To reset the date range, select ![Clear filter button](/images/analytics/clear-filter-button.png) button in the date picker.

You can also filter the table entries by values in **Task name**, **Assignee**, **Stage**, **State**, **User** columns:
1. In the search box, enter the value or part of the value to find
1. Select ![Search button](/images/analytics/search-button.png) button or press *Enter*

The events table columns:

<!--lint disable maximum-line-length-->

| **Column name** | **Content** |
|-----------------|-------------|
| **Task ID** | The ID of the task. If the task exists (the **Exists** column has the value `true`), you can select the value to open the task. |
| **Task name** | The task name. By default, the column is hidden. Select the value to open the task. |
| **Job ID** | The ID of the job. If the job exists (the **Exists** column has the value `true`), you can select the value to open the job. |
| **Type** | The task (**Task ID**) type |
| **Frame Count** | The total number of frames in the job (**Job ID**) |
| **Exists** | Indicates if both the job (**Job ID**) and the task (**Task ID** / **Task name**) exist at the last data fetch. |
| **Objects** | The total number of existing objects on the job (**Job ID**) frames |
| **Assignee** | The job (**Job ID**) assignee. |
| **Stage** | The stage of the job (**Job ID**). |
| **State** | The state of the job (**Job ID**). |
| **User** | The name of the user who triggered the event |
| **Working time** | Displays the total time spent during the event (in seconds?). By default, the column is hidden. |
| **Start UTC time** | The Coordinated Universal Time (UTC) at which the event was started. |
| **End UTC time** | The Coordinated Universal Time (UTC) at which the event was finished. By default, the column is hidden. |
| **Created objects** | The total number of created objects. By default, the column is hidden. |
| **Updated objects** | The total number of updated objects. By default, the column is hidden. |
| **Deleted objects** | The total number of deleted objects. By default, the column is hidden. |

<!--lint enable maximum-line-length-->

## Working with tables

For tables in the **Annotations** and **Events** tabs, you can:
1. Export the data: select ![Export button](/images/analytics/export-button.png) button.
   > **Note:** the applied filters and visible columns do not affect the file with exported data.
   > It always contains the complete table with all columns and rows.
1. Filter the table entries by a custom rule, select **Filter**, and set criteria for the filtering.
   To learn more about how to set a filter, refer to the **{{< ilink "/docs/manual/advanced/filter" "Filter" >}}**
   article.
1. Reset all applied filters: select **Clear filters**.
1. Manage the table columns:
  1. Select ![Menu button](/images/analytics/menu-button-vertical.png) above the right side of the table.
  1. Select the checkboxes for the columns to display them in the table,
     or unselect them to hide the corresponding columns.
1. Sort the table entries by column values. Select the column name to apply sorting.
   The arrows near the column name indicate the applied sorting order. The arrow up indicates
   ascending order, the arrow down indicates descending order.
   You can sort the entries by one column only.

Large tables are split into pages. You can find the pagination controls under the table.
You can also change the number of entries per page.
