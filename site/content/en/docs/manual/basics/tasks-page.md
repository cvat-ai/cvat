---
title: 'Tasks page'
linkTitle: 'Tasks page'
weight: 3
description: 'Overview of the Tasks page.'
---

![](/images/image006_detrac.jpg)

The tasks page contains elements and each of them relates to a separate task. They are sorted in creation order.
Each element contains: task name, preview, progress bar, button `Open`, and menu `Actions`.
Each button is responsible for a in menu `Actions` specific function:

- `Export task dataset` — download annotations or annotations and images in a specific format.
  More information is available in the [export/import datasets](/docs/manual/advanced/export-import-datasets/)
  section.
- `Upload annotation` upload annotations in a specific format.
  More information is available in the [export/import datasets](/docs/manual/advanced/export-import-datasets/)
  section.
- `Automatic Annotation` — automatic annotation with OpenVINO toolkit.
  Presence depends on how you build the CVAT instance.
- `Backup task` — make a backup of this task into a zip archive.
  Read more in the [backup](/docs/manual/advanced/backup/) section.
- `Move to project` — Moving a task to a project (can be used to move a task from one project to another).
  Note that attributes reset during the moving process. In case of label mismatch,
  you can create or delete necessary labels in the project/task.
  Some task labels can be matched with the target project labels.
- `Delete` — delete task.

---

Push `Open` button to go to [task details](/docs/manual/basics/task-details/).
