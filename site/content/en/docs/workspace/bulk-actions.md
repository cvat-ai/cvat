---
title: 'Bulk actions'
linkTitle: 'Bulk actions'
weight: 10
aliases:
  - /docs/manual/advanced/bulk-actions/
---

## Overview

Bulk Actions allow you to select multiple resources (such as jobs, tasks, projects and more) and perform actions
on all of them at once. This streamlines workflows by enabling mass updates, such as changing an assignee or state
for a group of jobs, without needing to update each resource individually.

### Supported Resources

- **Jobs**
- **Tasks**
- **Projects**
- **Cloud storages**
- **Requests**
- **Models**
- **Webhooks**
- **Organization members**


### Typical Bulk Actions

- **Update Assignee:** Assign a new user to multiple jobs, tasks, or projects.
- **Update State/Stage:** Change the status or stage for a group of jobs.
- **Delete:** Remove multiple resources in one operation.
- **Other field updates:** Depending on resource type, other fields may be updated in bulk.

### How It Works

1. **Selection:** Select multiple resources using selection tools in the UI.
   - **Ctrl (Cmd for Mac) + Click:** Select or deselect individual resources by holding the Ctrl key and clicking on
   them.
   - **Shift + Click:** Select a range of resources by clicking the first item, holding Shift, and clicking the last
   item in the range.
   - **Select All Button:** Use the "Select All" button in the top bar to select all resources on the current page.
   - **Click:** Click anywhere outside the selected resources to reset the selection.
{{% alert title="Note" color="primary" %}}
Selection is limited to visible resources according to the current page size, filtering, and sorting options.
It's important to adjust filters or sorting before selection to bring them into view.
Changing the page clears all selected resources.
{{% /alert %}}
1. **Action Menu:** Once resources are selected, you can either right-click on any of them or left-click the actions
menu of a selected resource. An actions appears, offering bulk operations relevant to that resource type.
1. **Execution:** The chosen action is applied to all selected resources. Progress and status messages are shown for
each item.
1. **Error Handling:** If an operation fails for some items, the system provides feedback and allows retrying the
failed items.

![Bulk actions demo](/images/bulk-actions.gif)
