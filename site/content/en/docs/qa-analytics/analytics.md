---
title: 'Analytics'
linkTitle: 'Analytics'
weight: 6
description: 'Learn how to access and analyze detailed data and metrics in CVAT Online and Enterprise.'
aliases:
  - /docs/manual/advanced/analytics-and-monitoring/analytics/
---

CVAT provides analytics data for projects, tasks, and jobs to help
you to track annotation progress and performance metrics at every level.
Analytics support a wide range of use cases, including:

- Defining the working time a user spent on a job during a specific period.
- Tracking time spent in each job stage.
- Calculating the total number of ground truth objects in a project.
- Determining the number of ground truth images in a project.
- Checking interpolation rates to assess annotator efficiency.
- Identifying how many objects of a specific label were annotated in a resource.
- Calculating the average annotation speed of a user in a project or task.
- Analyzing how many objects or images were present in removed resources.

Analytics is a paid feature available in CVAT Online (paid tiers) and CVAT Enterprise.

In personal workspaces, analytics are available only to the workspace owner.
In organizations, access depends on the user's
{{< ilink "/docs/account_management/user-roles#organization-roles-in-cvat" "organizational role">}}:

- **Owners** and **Maintainers**: Full access to all analytics.
- **Supervisors**: Access only to analytics for visible projects, tasks, and jobs.
- **Workers**: Access only to analytics for tasks and jobs assigned to them.
  Workers cannot update the analytics data.

## Access

To open analytics:

{{< tabpane text=true >}}

{{% tab header="For a project" %}}

1. Open **Projects**.
1. Open the project menu using ![Open menu](/images/openmenu.jpg)
   or open a project and select **Actions**.
1. Select **View analytics**.

{{% /tab %}}

{{% tab header="For a task" %}}

You can open analytics for a task using the **Tasks** or **Projects** pages.
To open a task analytics on the **Tasks** page:
1. Open **Tasks**.
1. Open the **Actions** menu for a task, or open a task and select **Actions**.
1. Select **View analytics**.

To open a task analytics from a project:
1. Open **Projects**
1. Open a project
1. Open the **Actions** menu for a task.
1. Select **View analytics**.

{{% /tab %}}

{{% tab header="For a job" %}}

You can open analytics for a job using the **Jobs** or **Tasks** pages.
To open a job analytics on the **Jobs** page:
1. Open **Jobs**.
1. Open the job menu using ![Open menu](/images/openmenu.jpg) button.
1. Select **View analytics**.

To open a job analytics from a task:
1. Open **Tasks**.
1. Open a task.
1. Open the job menu using ![Open menu](/images/openmenu.jpg) button.
1. Select **View analytics**.

{{% /tab %}}

{{< /tabpane >}}

## Analytics page

The **Analytics** page displays the data relevant to the specific resource (project, task, or job).
Use the link in the page title to return to the corresponding project, task, or job.

Analytics data is not fetched automatically. When you first open the **Analytics** page, it will be empty.
To fetch and display the analytical data, select the **Request** button.

{{% alert title="Note" color="primary" %}}
The analytical data is fetched for all resource children.
So, when you request data for a task, the data for all task jobs is also fetched.
{{% /alert %}}

Once the data is fetched and displayed on the page, you can check its relevance under the page title.
A warning icon ![Warning icon](/images/warning-icon.svg) indicates
that the resource was updated after the last analytics update.

To update the data, select ![Fetch analytics button](/images/fetch-data-button.svg) button.

The **Analytics** page includes:
- [**Summary**](#summary-tab) tab.
- [**Annotations**](#annotations-tab) tab.
- [**Events**](#events) tab.
- Date filter.
- **Export events** button.

{{% alert title="Note" color="primary" %}}
The date filter is applied to the [**Summary**](#summary-tab)
and [**Events**](#events-tab) tabs.
{{% /alert %}}

The **Summary** tab provides a statistics overview, while the **Annotations** and **Events** tabs
contain the detailed data in table form.

To download a CSV file with all event data, select the **Export events** button.

### Summary tab

![Summary tab in Analytics](/images/analytics/summary-tab.jpg)

The **Summary** tab displays the quantitative metrics:
- **Objects diff**: Difference between created and deleted objects in the selected time period.
  The value may be negative, if the number of the deleted objects exceeds the number of the
  created objects during the selected time period.
- **Total working time**: Total hours spent across all users, based on annotation-related events.
- **Avg. annotation speed**: Average number of objects annotated per hour.
  The value may be negative, if the number of the deleted objects exceeds the number of the
  created objects during the selected time period.

The **Summary** tab includes charts for object statistics, annotation speed, and diagrams
for annotation distribution by labels and types. Hover over a chart or diagram to display tooltips.

### Annotations tab

![Annotation tab in Analytics](/images/analytics/annotation-tab-detection.jpg)

The **Annotations** tab shows annotation statistics for:
- {{< ilink "/docs/annotation/manual-annotation/shapes/shape-mode-basics" "Shape mode">}} (the **Detections** tab).
- {{< ilink "/docs/annotation/manual-annotation/shapes/track-mode-basics" "Track mode">}} (the **Tracking** tab).

Both tabs always reflect the current state of the resource.
Each tab includes a filterable, customizable table
(learn [how to work with tables](#working-with-tables)).

You can search entries by the **Label name** column:
1. In the search box, enter the value or part of the value to find.
1. Select ![Search button](/images/search-button.svg) button or press _Enter_.

The **Detection** tab table contains the columns:

| **Column name** | **Content** |
| --------------- | ----------- |
| **Label ID** | The ID of the label. |
| **Label name** | The name of the label. |
| Columns with {{< ilink "/docs/annotation/manual-annotation/shapes/types-of-shapes" "label types names">}} | The number of objects per label type. By default, the columns with zero values are hidden. |
| **Total shapes** | The total number of all label shapes. |


The **Tracking** tab table contains the columns:

| **Column name** | **Content** |
| --------------- | ----------- |
| **Label ID** | The ID of the label. |
| **Label name** | The name of the label. |
| Columns with {{< ilink "/docs/annotation/manual-annotation/shapes/types-of-shapes" "label type names">}} | The number of objects per label type. By default, the columns with zero values are hidden. |
| **Keyframes** | The number of the label keyframes. |
| **Interpolated** | The number of {{< ilink "/docs/getting_started/vocabulary#interpolation" "interpolated frames" >}} with the label. |
| **Tracks** | The number of the label {{< ilink "/docs/getting_started/vocabulary#track" "tracks" >}}. |
| **Total objects** | The total number of all label objects. |

### Events tab

![Events tab in Analytics](/images/analytics/events-tab.jpg)

The **Events** tab displays the following metrics:
- **Total objects**: Total number of objects in the filtered jobs.
- **Total images**: Total number of images in the filtered jobs.
- **Total working time**: Total user time spent.
- **Avg. annotation speed**: : Average number of objects annotated per hour.

{{% alert title="Note" color="primary" %}}
All metrics are recalculated when you apply the date or table filter.
{{% /alert %}}

The **Events** tab table contains the aggregated events for the selected resource.
Each event is defined by a unique status signature, which is a combination of the
job’s assignee, stage, state, and the user who performed the action.
As long as this status signature stays the same, all events are combined into one row.
For example, if the same user creates two objects in the same job,
the **Events** table will display one event that includes both actions.

However, if the job’s status signature changes (for example, due to an action
performed by a different user) the analytics register a new event. As a result,
actions that might otherwise be aggregated are instead recorded as separate events in the table.

You can filter the events by date range:
1. Select the date filter near the page title.
1. Select the first and last dates or enter them in `YYYY-MM-DD` format.

If the date filter is empty, the **Events** tab shows the metrics and events
for the lifetime of the project, task, or job.

To reset the date range, select ![Clear filter button](/images/clear-filter-button.svg)
button in the date filter.

You can search the table entries by values in **Task name**, **Assignee**, **Stage**, **State**, **User** columns:
1. In the search box, enter the value or part of the value to find.
1. Select ![Search button](/images/search-button.svg) button or press _Enter_.

Other common operations with tables are described in the [**Working with tables**](#working-with-tables) paragraph.

The events table columns:

| **Column name** | **Content** |
| --------------- | ----------- |
| **Task ID** | The ID of the task. If the task exists (the **Exists** column has the value `true`), you can select the value to open the task. |
| **Task name** | The task name. By default, the column is hidden. Select the value to open the task. |
| **Job ID** | The ID of the job. If the job exists (the **Exists** column has the value `true`), you can select the value to open the job. |
| **Type** | The job (**Job ID**) type. Possible values: `Annotation`, `Ground truth`, `Consensus replica`. |
| **Frame Count** | The total number of frames in the job (**Job ID**) |
| **Exists** | Indicates if the job (**Job ID**) existed at the last data fetch. |
| **Objects** | The total number of existing objects on the job (**Job ID**) frames |
| **Assignee** | The job (**Job ID**) assignee when the event occurred. |
| **Stage** | The stage of the job (**Job ID**) when the event occurred. |
| **State** | The state of the job (**Job ID**) when the event occurred. |
| **User** | The name of the user who triggered the event. |
| **Working time** | Displays the total time in milliseconds spent during the events. By default, the column is hidden. |
| **Start UTC time** | UTC time when the event started. |
| **End UTC time** | UTC time when the event finished. By default, the column is hidden. |
| **Created objects** | The total number of created objects. By default, the column is hidden. |
| **Updated objects** | The total number of updated objects. By default, the column is hidden. |
| **Deleted objects** | The total number of deleted objects. By default, the column is hidden. |

## Working with tables

The tables in the **Annotations** and **Events** tabs support:
1. Exporting the data: select ![Export button](/images/export-button.svg) button.

   {{% alert title="Note" color="primary" %}}
   Visible columns do not affect the file with exported data.
   It always contains the complete table with all columns and rows.
   {{% /alert %}}

1. Filtering entries by a custom rule: select **Filter**, and set filtering criteria.
   To learn more about how to set a filter, refer to the **{{< ilink
    "/docs/annotation/manual-annotation/utilities/filter" "Filter" >}}**
   article.
1. Clearing filters: select **Clear filters**.
1. Customizing columns:
   1. Select ![Menu button](/images/menu-button-vertical.svg) above the right side of the table.
   1. Toggle the checkboxes for the columns to display or hide them in the table.
1. Sorting entries: select the column name to apply sorting.
   The arrows near the column name indicate the applied sorting order. The arrow up indicates
   ascending order, the arrow down indicates descending order.
   You can sort the entries by one column only.

Large tables are split into pages. You can find the pagination controls under the table.
You can also change the number of entries per page.
