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

Regenerate analytics report button

Date filter

**Export events** button.

### Summary

For projects, the **Summary** tab displays the quantative metrics:
- **Objects diff** is the difference between the created and deleted objects across the project.
- **Total working time** is the time in hours spent on the project across all users.
  The time is calculated based on the project events, such as creating annotations, and so on.
- **Avg. annotation speed** is the average number of the project objects annotated per hour.

The **Summary** tab also provides graphs for objects, annotation speed, and the annotation distribution
by labels and types.

### Annotations

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

**Trackong** tab:

- **Label ID**
- **Label name**
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
- filters
- search (by label name)
- hidden table columns
- pagination

Table:
- **Task ID**
- **Task name**
- **Job ID**
- **Type**
- **Frame Count**
- **Exists**
- **Objects**
- **Assignee**
- **Stage**
- **State**
- **User**
- **Working time**
- **Start UTC time**
- **End UTC time**
- **Created objects**
- **Updated objects**
- **Deleted objects**

