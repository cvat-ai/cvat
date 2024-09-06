---
title: 'Annotation with brush tool'
linkTitle: 'Annotation with brush tool'
weight: 13
description: 'Guide to annotating tasks using brush tools.'
---

With a brush tool, you can create masks for disjoint objects, that have multiple parts,
such as a house hiding behind trees, a car behind a pedestrian, or a pillar behind a
traffic sign.
The brush tool has several modes, for example: erase pixels, change brush shapes, and polygon-to-mask mode.

Use brush tool for Semantic (Panoptic) and Instance Image Segmentation tasks. <br>For more information about segmentation masks in CVAT, see {{< ilink "/docs/manual/advanced/annotation-with-polygons/creating-mask" "Creating masks" >}}.

See:

- [Brush tool menu](#brush-tool-menu)
- [Annotation with brush](#annotation-with-brush)
- [Annotation with polygon-to-mask](#annotation-with-polygon-to-mask)
- [Remove underlying pixels](#remove-underlying-pixels)
- [AI Tools](#ai-tools)
- [Import and export](#import-and-export)

## Brush tool menu

The brush tool menu appears on the top of the screen after you click **Shape**:

![BT Menu](/images/brushing_tool_menu.png)

It has the following elements:

<!--lint disable maximum-line-length-->

| Element                                                         | Description                                                                                                                                                                                              |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| ![Tick icon](/images/tick_icon.png)                             | **Save mask** saves the created mask. The saved mask will appear on the object sidebar                                                                                                                   |
| ![Save mask and continue](/images/brushing_tools_add_label.png) | **Save mask and continue** adds a new mask to the object sidebar and allows you to draw a new one immediately.                                                                                           |
| ![Brush](/images/brushing_tools_icon.png)                       | **Brush** adds new mask/ new regions to the previously added mask).                                                                                                                                      |
| ![Eraser](/images/brushing_tools_erase.png)                     | **Eraser** removes part of the mask.                                                                                                                                                                     |
| ![Add poly](/images/brushing_tools_add_poly.png)                | **Polygon** selection tool. Selection will become a mask.                                                                                                                                                |
| ![Remove poly](/images/brushing_tools_remove_poly.png)          | **Remove polygon selection** subtracts part of the polygon selection.                                                                                                                                    |
| ![Brush size](/images/brushing_tools_brush_size.png)            | **Brush size** in pixels. <br>**Note:** Visible only when **Brush** or **Eraser** are selected.                                                                                                          |
| ![Brush shape](/images/brushing_tools_brush_shape.png)          | **Brush shape** with two options: circle and square. <br>**Note:** Visible only when **Brush** or **Eraser** are selected.                                                                               |
| ![Pixel remove](/images/brushing_tools_pixels.png)              | **Remove underlying pixels**. When you are drawing or editing a mask with this tool, <br>pixels on other masks that are located at the same positions as the pixels of the <br>current mask are deleted. |
| ![Label](/images/brushing_tools_label_drop.png)                 | **Label** that will be assigned to the newly created mask                                                                                                                                                |     |
| ![Move](/images/brushing_tools_brush_move.png)                  | **Move**. Click and hold to move the menu bar to the other place on the screen                                                                                                                           |

<!--lint enable maximum-line-length-->

## Annotation with brush

To annotate with brush, do the following:

1. From the {{< ilink "/docs/manual/basics/CVAT-annotation-Interface/controls-sidebar" "controls sidebar" >}},
   select **Brush** ![Brush icon](/images/brushing_tools_icon.png).
2. In the **Draw new mask** menu, select label for your mask, and click **Shape**. <br>The **Brush**![Brush](/images/brushing_tools_icon.png) tool will be selected by default.

   ![BT context menu](/images/brushing_tools_context_menu.png)

3. With the brush, draw a mask on the object you want to label. <br>To erase selection, use **Eraser** ![Eraser](/images/brushing_tools_erase.png)

   ![Brushing](/images/brushing_tools.gif)

4. After you applied the mask, on the top menu bar click **Save mask** ![Tick icon](/images/tick_icon.png) <br>to finish the process (or **N** on the keyboard).
5. Added object will appear on the
   {{< ilink "/docs/manual/basics/CVAT-annotation-Interface/objects-sidebar" "objects sidebar" >}}.

To add the next object, repeat steps 1 to 5.
All added objects will be visible on the image and the
{{< ilink "/docs/manual/basics/CVAT-annotation-Interface/objects-sidebar" "objects sidebar" >}}.

To save the job with all added objects, on the top menu, click **Save** ![Save](/images/brushing_tools_save.png).

## Annotation with polygon-to-mask

To annotate with polygon-to-mask, do the following:

1. From the {{< ilink "/docs/manual/basics/CVAT-annotation-Interface/controls-sidebar" "controls sidebar" >}},
   select **Brush** ![Brush icon](/images/brushing_tools_icon.png).
2. In the **Draw new mask** menu, select label for your mask, and click **Shape**.

   ![BT context menu](/images/brushing_tools_context_menu.png)

3. In the brush tool menu, select **Polygon** ![Add poly](/images/brushing_tools_add_poly.png).
4. With the **Polygon**![Add poly](/images/brushing_tools_add_poly.png) tool, draw a mask for the object you want to label. <br>To correct selection, use **Remove polygon selection** ![Remove poly](/images/brushing_tools_remove_poly.png).
5. Use **Save mask** ![Tick icon](/images/tick_icon.png) (or **N** on the keyboard) <br>to switch between add/remove polygon tools:

   ![Brushing](/images/brushing_tools_polygon.gif)

6. After you added the polygon selection, on the top menu bar click **Save mask** ![Tick icon](/images/tick_icon.png) <br>to finish the process (or **N** on the keyboard).
7. Click **Save mask** ![Tick icon](/images/tick_icon.png) again (or **N** on the keyboard). <br>The added object will appear on the {{< ilink "/docs/manual/basics/CVAT-annotation-Interface/objects-sidebar" "objects sidebar" >}}.

To add the next object, repeat steps 1 to 5.

All added objects will be visible on the image and the
{{< ilink "/docs/manual/basics/CVAT-annotation-Interface/objects-sidebar" "objects sidebar" >}}.

To save the job with all added objects, on the top menu, click **Save** ![Save](/images/brushing_tools_save.png).

## Remove underlying pixels

Use **Remove underlying pixels** tool when you want to add a mask and simultaneously delete the pixels of <br>other masks that are located at the same positions. It is a highly useful feature to avoid meticulous drawing edges twice between two different objects.

![Remove pixel](/images/brushing_tools_pixel_underlying.gif)

## AI Tools

You can convert {{< ilink "/docs/manual/advanced/ai-tools" "AI tool" >}} masks to polygons.
To do this, use the following {{< ilink "/docs/manual/advanced/ai-tools" "AI tool" >}} menu:

![Save](/images/brushing_tool_ai.jpg)

1. Go to the **Detectors** tab.
2. Switch toggle **Masks to polygons** to the right.
3. Add source and destination labels from the drop-down lists.
4. Click **Annotate**.

## Import and export

For export, see {{< ilink "/docs/manual/advanced/import-datasets" "Export dataset" >}}

Import follows the general {{< ilink "/docs/manual/advanced/import-datasets" "import dataset" >}} procedure,
with the additional option of converting masks to polygons.

> **Note:** This option is available for formats that work with masks only.

To use it, when uploading the dataset, switch the **Convert masks to polygon** toggle to the right:

![Remove pixel](/images/brushing_tools_import.png)
