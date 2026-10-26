---
title: 'Jobs'
linkTitle: 'Jobs'
weight: 4
aliases:
  - /docs/manual/basics/jobs-page/
---

On the **Jobs** page, users (for example, with the worker role)
can see the jobs that are assigned to them without having access to the task page,
as well as track progress, sort, and apply filters to the job list.

![Jobs page example](/images/image243_detrac.jpg)

On the page, there is a list of jobs presented in the form of tiles, where each tile is one job.
Each element contains:
- job ID
- dimension `1D`, `2D`, or `3D`
- preview
- {{< ilink "/docs/getting_started/vocabulary#stage" "stage" >}} and
  {{< ilink "/docs/getting_started/vocabulary#state" "state" >}}
- when hovering over an element, you can see:
  - size
  - assignee
- menu to navigate to a task, project, or bug tracker.

{{% alert title="Note" color="primary" %}}
To open the job in a new tab, click on the job by holding `Ctrl`.
{{% /alert %}}

In the upper left corner, there is a search bar, using which you can find the job by assignee, stage, state, etc.
In the upper right corner, there are {{< ilink
 "/docs/annotation/manual-annotation/utilities/filter#sort-by" "sorting" >}},
{{< ilink "/docs/annotation/manual-annotation/utilities/filter#quick-filters" "quick filters" >}}, and filter.

## Filter

{{% alert title="Note" color="primary" %}}
Applying a filter disables the {{< ilink
 "/docs/annotation/manual-annotation/utilities/filter#quick-filters" "quick filter" >}}.
{{% /alert %}}

The filter works similarly to the filters for annotation,
you can create rules from [properties](#supported-properties-for-jobs-list),
{{< ilink "/docs/annotation/manual-annotation/utilities/filter#supported-operators-for-properties" "operators" >}},
and values and group rules into {{< ilink "/docs/annotation/manual-annotation/utilities/filter#groups" "groups" >}}.
For more details, consult the {{< ilink
 "/docs/annotation/manual-annotation/utilities/filter#create-a-filter" "filter section" >}}.
Learn more about {{< ilink
 "/docs/annotation/manual-annotation/utilities/filter#date-and-time-selection" "date and time selection" >}}.

To clear all filters, select `Clear filters`.

### Supported properties for jobs list

| Properties     | Supported values                             | Description                                 |
| -------------- | -------------------------------------------- | ------------------------------------------- |
| `State`        | all the state names                          | The state of the job <br>(can be changed in the menu inside the job) |
| `Stage`        | all the stage names                          | The stage of the job <br>(is specified by a drop-down list on the task page) |
| `Dimension`    | `1D`, `2D`, or `3D`                          | Depends on the data format <br>(read more in {{< ilink "/docs/workspace/tasks-page#create-annotation-task" "creating an annotation task" >}}) |
| `Assignee`     | username                                     | Assignee is the user who is working on the job. <br>(is specified on task page) |
| `Last updated` | last modified date and time (or value range) | The date can be entered in the `dd.MM.yyyy HH:mm` format <br>or by selecting the date in the window that appears <br>when you click on the input field |
| `ID`           | number or range of job ID                    |                                             |
| `Task ID`      | number or range of task ID                   |                                             |
| `Project ID`   | number or range of project ID                |                                             |
| `Task name`    | task name                                    | Set when creating a task, <br>can be changed on the ({{< ilink "/docs/workspace/tasks-page" "task page" >}}) |
| `Project name` | project name                                 | Specified when creating a project, <br>can be changed on the ({{< ilink "/docs/workspace/projects" "project section" >}}) |
| `Job Type`     | `Annotation`, `Ground truth`, or `Replica`   | The type of the job |
| `Parent ID`    | number or range of job ID                    | The ID of the parent annotation job of a replica job |

## Distribute jobs among users

You can assign several jobs to a list of users at once.
CVAT gives the jobs to the users in turn: the first job goes to the first user,
the second job goes to the second user, and so on.
When there are more jobs than users, it starts again from the first user.

The action is available on the **Jobs** page and in the job list of the task page
when two or more jobs are selected. It is not available in the
{{< ilink "/docs/account_management/organization#personal-workspace" "personal workspace" >}}.

1. Select the jobs. Read more about selecting several jobs in
   {{< ilink "/docs/workspace/bulk-actions" "Bulk actions" >}}.
1. Open the job **Actions** menu and click **Distribute among users**.
1. Add the users in one of the following ways:
   - Start typing a username in the **Usernames** field and select the user from the list.
   - Paste several usernames into the **Usernames** field, for example, a column copied from a spreadsheet.
     The usernames can be separated by spaces, line breaks, commas, or semicolons.
   - Click the upload area or drag a CSV file to it. The file must have one column with usernames.

   Usernames that are not found and repeated usernames are skipped.

1. Check the **Preview**. It shows the user that each job will be assigned to.

   ![Distribute jobs dialog](/images/distribute-jobs-dialog.png)

1. Click **Distribute**.

The jobs are assigned in the order they are listed on the page.
If there are more users than jobs, the extra users get no job.
