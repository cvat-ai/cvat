---
title: 'Shapes converter'
linkTitle: 'Shapes converter'
weight: 4
description: 'How to perform bulk actions on filtered shapes'
---

The shapes converter is a feature that enables bulk actions on filtered shapes. For example, it allows you to delete
all filtered shapes or convert masks to polygons, among other functions.

> **Note:** That currently, shape conversion is only applicable to **Shapes** and cannot be used for **Tracks**.

See:

- [Run actions menu](#run-actions-menu)
- [Convert shapes](#convert-shapes)

## Run actions menu

The Shapes Converter can be accessed from the annotation menu. To access it, click on the burger icon
and then select **Run actions**.

![](/images/run-actions-menu.jpg)

You will see the following dialog:

![](/images/shapes-converter-dialog.jpg)

With the following fields:

<!--lint disable maximum-line-length-->

| Field                                    | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Select action**                        | Drop-down list with available actions: <br><li>**Remove filtered shapes** - removes all shapes in alignment with the set-up filter.</li><li>**Shapes converter: masks to polygons** - converts all masks to polygons in alignment with the set-up filter.</li><li>**Shapes converter: masks to rectangles** - converts all masks to rectangles in alignment with the set-up filter.</li><li>**Shapes converter: polygon to masks** - converts all polygons to masks in alignment with the set-up filter.</li><li>**Shapes converter: polygon to rectangles** - converts all polygons to rectangles in alignment with the set-up filter.</li><li>**Shapes converter: rectangles to masks** - converts all rectangles to masks in alignment with the set-up filter.</li><li>**Shapes converter: rectangles to polygons** - converts all rectangles to polygons in alignment with the set-up filter.</li><br>**Note:** only **Remove filtered shapes** is available on the **Free** plan. |
| **Specify frames to run action**         | Field where you can specify the frame range for the selected action. Enter the starting frame in the **Starting from frame:** field, and the ending frame in the **up to frame** field. <br><br>If nothing is selected here or in **Choose one of the predefined options** section, the action will be applied to all fields.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Choose one of the predefined options** | Predefined options to apply to frames. Selection here is mutually exclusive with **Specify frames to run action**. <br><br>If nothing is selected here or in **Specify frames to run action** section, the action will be applied to all fields.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

<!--lint enable maximum-line-length-->

## Convert shapes

To convert shapes, do the following:

1. Annotate your dataset.

   ![](/images/shapes-converter-annotated-dataset.jpg)

2. Set up [filters](/docs/manual/advanced/filter/).

   ![](/images/shapes-converter-setup-filter.png)

3. From the burger menu, select **Run actions**.
4. Choose the action you need from the **Select action** drop-down list.
5. (Optional) In the **Starting from frame** field, enter the frame number where the action should begin,
   and in the **up to frame** field, specify the frame number where the action should end.
6. (Optional) Select an option from **Or choose one of the predefined options** to apply the action.
7. Click **Run**. <br> A progress bar will appear. If it's not fully green and you want to stop the action,
   you can click **Cancel**.

   ![](/images/shapes-coverter-action-run.jpg)

> **Note:** Once the action is applied, it cannot be undone.
