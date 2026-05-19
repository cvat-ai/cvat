---
title: 'Shapes converter'
linkTitle: 'Shapes converter'
weight: 2
description: 'How to perform bulk actions on filtered shapes'
aliases:
- /docs/enterprise/shapes-converter/
- /docs/annotation/tools/shapes-converter/
---

The shapes converter is a feature that enables bulk actions on filtered **shapes**. It allows you to perform mutual
conversion between masks, polygons and rectangles.

{{% alert title="Note" color="primary" %}}
All shapes converter work only when the filter is set up.
{{% /alert %}}

See:

- [Run actions menu](#run-actions-menu)
- [Convert shapes](#convert-shapes)
- [Convert shapes video tutorial](#convert-shapes-video-tutorial)

## Run actions menu

Annotations actions can be accessed from the annotation menu.
To access it, click on the burger icon
and then select **Run actions**.

{{% alert title="Note" color="primary" %}}
All **Shapes converter** functions work in alignment with set up filter.
{{% /alert %}}

![Run actions menu open in annotation](/images/run-actions-menu.jpg)

You will see the following dialog:

![Dialog for removing filtered shapes](/images/shapes-converter-dialog.jpg)

With the following fields:


| Field                                    | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Select action**                        | Drop-down list with available actions: <br><li>**Remove filtered shapes** - removes all shapes in alignment with the set-up filter. Doesn't work with tracks.</li><li>**Propagate shapes** - propagates all the filtered shapes from the current frame to the target frame.</li><li>**Shapes converter: masks to polygons** - converts all masks to polygons.</li><li>**Shapes converter: masks to rectangles** - converts all masks to rectangles in alignment with the set-up filter.</li><li>**Shapes converter: polygon to masks** - converts all polygons to masks.</li><li>**Shapes converter: polygon to rectangles** - converts all polygons to rectangles.</li><li>**Shapes converter: rectangles to masks** - converts all rectangles to masks.</li><li>**Shapes converter: rectangles to polygons** - converts all rectangles to polygons.</li><br>**Note:** only **Propagate shapes** and **Remove filtered shapes** is available in the community version. |
| **Specify frames to run action**         | Field where you can specify the frame range for the selected action. Enter the starting frame in the **Starting from frame:** field, and the ending frame in the **up to frame** field. <br><br>If nothing is selected here or in **Choose one of the predefined options** section, the action will be applied to all fields.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Choose one of the predefined options** | Predefined options to apply to frames. Selection here is mutually exclusive with **Specify frames to run action**. <br><br>If nothing is selected here or in **Specify frames to run action** section, the action will be applied to all fields.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

## Convert shapes

**Recommended Precautions Before Running Annotation Actions**

- **Saving changes:** It is recommended to save all changes prior to initiating the annotation action.
  If unsaved changes are detected, a prompt will advise to save these changes
  to avoid any potential loss of data.

- **Disable auto-save:** Prior to running the annotation action, disabling the auto-save feature
  is advisable. A notification will suggest this action if auto-save is currently active.

- **Committing changes:** Changes applied during the annotation session
  will not be committed to the server until the saving process is manually
  initiated. This can be done either by the user or through the
  auto-save feature, should it be enabled.

To convert shapes, do the following:

1. Annotate your dataset.

   ![Example of annotated dataset with different shapes](/images/shapes-converter-annotated-dataset.jpg)

2. Set up {{< ilink "/docs/annotation/manual-annotation/utilities/filter" "filters" >}}.

   ![Example of a filter for shapes](/images/shapes-converter-setup-filter.png)

3. From the burger menu, select **Run actions**.
4. Choose the action you need from the **Select action** drop-down list.
5. (Optional) In the **Starting from frame** field, enter the frame number where the action should begin,
   and in the **up to frame** field, specify the frame number where the action should end.
6. (Optional) Select an option from **Or choose one of the predefined options** to apply the action.
7. Click **Run**. <br> A progress bar will appear. You may abort the process by clicking **Cancel** until the process commits modified objects at the end of pipeline.

   ![Progress bar for shapes converter with defined parameters](/images/shapes-converter-action-run.jpg)

{{% alert title="Note" color="primary" %}}
Once the action is applied, it cannot be undone.
{{% /alert %}}

## Convert shapes video tutorial

<iframe width="560" height="315" src="https://www.youtube.com/embed/sAVEdjmw0C0?si=ZhRuwdAMSNrdieBp" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
