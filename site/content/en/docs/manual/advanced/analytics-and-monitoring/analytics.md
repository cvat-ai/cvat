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

Accessibility for users:

## Analytics page

Analytics data is fetched only manually, so when you open the **Analytics** page
the first time it is empty. To fetch and display the analytical data, select **Request**
button.

Once the data is displayed on the page, you can check its relevance under the page title.

To update the data, select ![Fetch analytics button](/images/analytics/fetch-data-button.png) button.

The date filter is applied to the **Events** tab only.

**Export events** button.

### Summary tab

For projects, the **Summary** tab displays the quantative metrics:
- **Objects diff** is the difference between the created and deleted objects across the project.
- **Total working time** is the time in hours spent on the project across all users.
  The time is calculated based on the project events, such as creating annotations, and so on.
- **Avg. annotation speed** is the average number of the project objects annotated per hour.

The **Summary** tab also provides graphs for objects, annotation speed, and the annotation distribution
by labels and types.

### Annotations tab

- download table button
- filters
- search (by label name)
- hidden table columns
- pagination

**Detection** tab:

- **Label ID**
- **Label name**
- label types
- **Total shapes**

**Tracking** tab:

- **Label ID**
- **Label name**
- label types
- **Keyframes**
- **Interpolated**
- **Tracks**
- **Total objects**

### Events

Metrics:
- **Total objects** is the total number of objects in the project jobs
- **Total images** is the total number of images in the project jobs
- **Total working time** is the time in hours spent on the project across all users.
    This is the same metric as on the **Summary** tab.
- **Avg. annotation speed** is the average number of the project objects annotated per hour.
    This is the same metric as on the **Summary** tab.

- download table button

You can filter the table entries by values in **Task name**, **Assignee**, **Stage**, **State**, **User** columns:
1. In the search box, enter the value or part of the value to find
1. Select ![Search button](/images/analytics/search-button.png) button or press *Enter*

To filter the table entries by other rule, select **Filter** and set criterias for the filtering.
To learn more about how to set a filter, refer to the **{{< ilink "/docs/manual/advanced/filter" "Filter" >}}**
article.

To manage the table columns:
1. Select above the right side of the table
1. Select the checkboxes for the columns to display them in the table,
   or unselect them to hide the corresponding columns

> **Note:** the applied filters and visible columns do not affect the exported file.
> It always contains the complete table with all columns and rows.

- pagination

The table columns:
- **Task ID** is the ID of the task (uniqueness?). Select the value to open the task.
- **Task name** is the task name. By default, the colunm is hidden. Select the value to open the task.
- **Job ID** is the ID of the job. Select the value to open the job.
- **Type** is the type of the event. Possible values:
- **Frame Count**
- **Exists** indicates if the job (**Job ID**) or the task (**Task ID** / **Task name**) exists at the last data fetch
- **Objects**
- **Assignee** is the job (**Job ID**) assignee
- **Stage** is the stage of the job in the **Job ID** column.
- **State** is the state of the job in the **Job ID** column.
- **User**
- **Working time** displays the total time spent during the event (in seconds?). By default, the colunm is hidden.
- **Start UTC time** is the Coordinated Universal Time (UTC) when the event was started
- **End UTC time** is the Coordinated Universal Time (UTC) when the event was finished. By default, the colunm is hidden.
- **Created objects** is the total number of created objects. By default, the colunm is hidden.
- **Updated objects** is the total number of updated objects. By default, the colunm is hidden.
- **Deleted objects** is the total number of deleted objects. By default, the colunm is hidden.

