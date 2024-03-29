---
title: 'Shapes converter'
linkTitle: 'Shapes converter'
weight: 4
description: 'How to perform bulk actions on filtered shapes'
---

The shapes converter is a feature that enables bulk actions on filtered **shapes**. It allows you to perform mutual
conversion between masks, polygons and rectangles.

> **Note:** All shapes converter work only when the filter is set up.

See:

- [Run actions menu](#run-actions-menu)
- [Convert shapes](#convert-shapes)
- [Convert shapes video tutorial](#convert-shapes-video-tutorial)

## Run actions menu

Annotations actions can be accessed from the annotation menu.
To access it, click on the burger icon
and then select **Run actions**.

> Note: All **Shapes converter** functions work in alignment with set up filter.

![](/images/run-actions-menu.jpg)

You will see the following dialog:

![](/images/shapes-converter-dialog.jpg)

With the following fields:

<!--lint disable maximum-line-length-->

| Field                                    | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Select action**                        | Drop-down list with available actions: <br><li>**Remove filtered shapes** - removes all shapes in alignment with the set-up filter. Doesn't work with tracks.</li><li>**Shapes converter: masks to polygons** - converts all masks to polygons.</li><li>**Shapes converter: masks to rectangles** - converts all masks to rectangles in alignment with the set-up filter.</li><li>**Shapes converter: polygon to masks** - converts all polygons to masks.</li><li>**Shapes converter: polygon to rectangles** - converts all polygons to rectangles.</li><li>**Shapes converter: rectangles to masks** - converts all rectangles to masks.</li><li>**Shapes converter: rectangles to polygons** - converts all rectangles to polygons.</li><br>**Note:** only **Remove filtered shapes** is available on the **Free** plan. |
| **Specify frames to run action**         | Field where you can specify the frame range for the selected action. Enter the starting frame in the **Starting from frame:** field, and the ending frame in the **up to frame** field. <br><br>If nothing is selected here or in **Choose one of the predefined options** section, the action will be applied to all fields.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Choose one of the predefined options** | Predefined options to apply to frames. Selection here is mutually exclusive with **Specify frames to run action**. <br><br>If nothing is selected here or in **Specify frames to run action** section, the action will be applied to all fields.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

<!--lint enable maximum-line-length-->

## Convert shapes

**Recommended Precautions Before Running Annotation Actions**

- **Saving changes:** It is recommended to save all changes prior to initiating the annotation action.
  If unsaved changes are detected, a prompt will advise to save these changes
  to avoid any potential loss of data.

- **Disabу auto-save:** Prior to running the annotation action, disabling the auto-save feature
  is advisable. A notification will suggest this action if auto-save is currently active.

- **Committing changes:** Changes applied during the annotation session
  will not be committed to the server until the saving process is manually
  initiated. This can be done either by the user or through the
  auto-save feature, should it be enabled.

To convert shapes, do the following:

1. Annotate your dataset.

   ![](/images/shapes-converter-annotated-dataset.jpg)

2. Set up {{< ilink "/docs/manual/advanced/filter" "filters" >}}.

   ![](/images/shapes-converter-setup-filter.png)

3. From the burger menu, select **Run actions**.
4. Choose the action you need from the **Select action** drop-down list.
5. (Optional) In the **Starting from frame** field, enter the frame number where the action should begin,
   and in the **up to frame** field, specify the frame number where the action should end.
6. (Optional) Select an option from **Or choose one of the predefined options** to apply the action.
7. Click **Run**. <br> A progress bar will appear. You may abort the process by clicking **Cancel** until the process commits modified objects at the end of pipeline.

   ![](/images/shapes-coverter-action-run.jpg)

> **Note:** Once the action is applied, it cannot be undone.

## Convert shapes video tutorial

<!--lint disable maximum-line-length-->

<iframe width="560" height="315" src="https://www.youtube.com/embed/sAVEdjmw0C0?si=ZhRuwdAMSNrdieBp" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>

<!--lint enable maximum-line-length-->
