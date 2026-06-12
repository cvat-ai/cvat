---
title: 'Join and slice tools'
linkTitle: 'Join and slice tools'
weight: 1
description: 'This section explains how to slice or join several labels'
aliases:
- /docs/manual/advanced/slice-and-join/
- /docs/annotation/tools/slice-and-join/
---

In CVAT you can modify shapes by either joining multiple shapes into
a single label or slicing a single label into several shapes.

This document provides guidance on how to perform these operations effectively.

See:

- [Joining polygons and masks](#joining-polygons-and-masks)
- [Slicing polygons and masks](#slicing-polygons-and-masks)

## Joining polygons and masks

The **Join tool** (![Join masks tool icon](/images/join-masks-icon.jpg))
works with both polygon and mask annotations.

This tool is useful in scenarios where a single object
in an image is annotated with multiple shapes,
and there is a need to merge these shapes into a single one.
For polygons, you can join overlapping polygons or polygons that share at least one edge.

![Join tool](/images/joining-tool-01.jpg)

To join polygons or masks, do the following:

1. From the {{< ilink "/docs/annotation/annotation-editor/controls-sidebar#edit" "**Edit**" >}} block,
   select **Join tool** ![Join masks tool icon](/images/join-masks-icon.jpg).
2. Click the shapes on the canvas that you want to join.
3. (Optional) To remove the selection, click the shape one more time.
4. Press **J** or click **Join tool** again to execute the join operation.

Upon completion, the selected shapes will be merged.

![Join tool gif](/images/joining-tool-02.gif)

Notes about polygon merging:

- For the merge operation to be successful, polygons must overlap or share at least one edge.
- Disjoint polygons are kept as separate polygons.
- Merge is not supported if the resulting polygon would create an enclosed empty region.
- Self-intersecting polygons are excluded from the join operation.

{{% alert title="Tip" %}}
The {{< ilink "/docs/annotation/manual-annotation/shapes/annotation-with-polygons/snap-tools" "**Snap tools**" >}}
can help the join operation work best by making polygon borders and vertices align more precisely.
{{% /alert %}}

![Join tool gif](/images/joining-tool-03.gif)

## Slicing polygons and masks

The **Slice mask/polygon** (![Slicing tool icon](/images/slicing-tool-icon.jpg))
is compatible with both mask and polygon annotations.

This tool is useful in scenarios where multiple objects in an image
are annotated with one shape,
and there is a need to slice this shape into multiple parts.

{{% alert title="Note" color="primary" %}}
The shape can be sliced only in two parts
at a time. Use the slice tool several times
to split a shape to as many parts as you need.
{{% /alert %}}

![Slicing tool](/images/slicing-tool-01.jpg)

To slice mask or polygon, do the following:

1. From the {{< ilink "/docs/annotation/annotation-editor/controls-sidebar#edit" "**Edit**" >}} block,
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
