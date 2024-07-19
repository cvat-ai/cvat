---
title: 'Join and slice tools'
linkTitle: 'Join and slice tools'
weight: 18
description: 'This section explains how to slice or join several labels'
---

In CVAT you can modify shapes by either joining multiple shapes into
a single label or slicing a single label into several shapes.

This document provides guidance on how to perform these operations effectively.

See:

- [Joining masks](#joining-masks)
- [Slicing polygons and masks](#slicing-polygons-and-masks)

## Joining masks

The **Join masks** tool (![Join masks tool icon](/images/join-masks-icon.jpg)),
is specifically designed to work with mask annotations.

This tool is useful in scenarios where a single object
in an image is annotated with multiple shapes,
and there is a need to merge these shapes into a single one.

![Join masks](/images/joining-tool-01.jpg)

To join masks, do the following:

1. From the {{< ilink "/docs/manual/basics/CVAT-annotation-Interface/controls-sidebar#edit" "**Edit**" >}} block,
   select **Join masks** ![Join masks tool icon](/images/join-masks-icon.jpg).
2. Click on the canvas area, to select masks that you want to join.
3. (Optional) To remove the selection click the mask one more time.
4. Click again on **Join masks**![Join masks tool icon](/images/join-masks-icon.jpg)
   (**J**) to execute the join operation.

Upon completion, the selected masks will be joined into a single mask.

![Join masks gif](/images/joining-tool-02.gif)

## Slicing polygons and masks

The **Slice mask/polygon** (![Slicing tool icon](/images/slicing-tool-icon.jpg))
is compatible with both mask and polygon annotations.

This tool is useful in scenarios where multiple objects in an image
are annotated with one shape,
and there is a need to slice this shape into multiple parts.

> **Note:** The shape can be sliced only in two parts
> at a time. Use the slice tool several times
> to split a shape to as many parts as you need.

![Slicing tool](/images/slicing-tool-01.jpg)

To slice mask or polygon, do the following:

1. From the {{< ilink "/docs/manual/basics/CVAT-annotation-Interface/controls-sidebar#edit" "**Edit**" >}} block,
   select **Slice mask/polygon** ![Slicing tool icon](/images/slicing-tool-icon.jpg).
2. Click on the shape you intend to slice.
   A black contour will appear around the selected shape.
3. Set an initial point for slicing by clicking on the contour.
4. Draw a line across the shape to define the slicing path.
   <br>Hold Shift to add points automatically on cursor movement.
   <br> **Note**: The line cannot cross itself.
   <br> **Note**: The line cannot cross the contour more than twice.
5. (Optional)> Right-click to cancel the latest point.
6. Click on the contour (**Alt**+**J**) (outside the contour) to finalize the slicing.

![Slicing tool](/images/slicing-tool-02.gif)
