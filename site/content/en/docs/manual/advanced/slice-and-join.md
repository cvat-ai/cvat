---
title: 'CVAT joining and slicing labels'
linkTitle: 'Joining and Slicing Labels'
weight: 18
description: 'This section explains how to slice or join several labels'
---

In CVAT you can modify labels by either joining multiple labels into
a single label or slicing a single label into several labels.

This document provides guidance on how to perform these operations effectively.

See:

- [Joining CVAT labels](#joining-cvat-labels)
- [Slicing CVAT labels](#slicing-cvat-labels)

## Joining CVAT labels

The **Join masks** tool (![Join masks tool icon](/images/join-masks-icon.jpg)),
is specifically designed to work with mask annotations.

This tool is useful in scenarios where a single object
in an image is annotated with multiple labels,
and there is a need to merge these labels into a single, unified label.

![Join masks](/images/joining-tool-01.jpg)

To join masks, do the following:

1. From the [**Edit**](/docs/manual/basics/controls-sidebar/#edit) block,
   select **Join masks** ![Join masks tool icon](/images/join-masks-icon.jpg).
2. Click on the labels, to select masks that you want to join.
3. (Optional) To remove selection double click on the mask.
4. Click again on **Join masks** ![Join masks tool icon](/images/join-masks-icon.jpg)
  (**J**) to execute the join operation.

Upon completion, the selected masks will be merged into a single mask.

![Join masks gif](/images/joining-tool-02.gif)

## Slicing CVAT labels

The **Slice mask/polygon** (![Slicing tool icon](/images/slicing-tool-icon.jpg))
is compatible with both mask and polygon annotations.

This tool is useful in scenarios where multiple object in an image
are annotated with one label labels,
and there is a need to slice this label into multiple labels.

![Slicing tool](/images/slicing-tool-01.jpg)

To slice mask or polygon, do the following:

1. From the [**Edit**](/docs/manual/basics/controls-sidebar/#edit) block,
   select **Slice mask/polygon** ![Slicing tool icon](/images/slicing-tool-icon.jpg).
2. Click on the label you intend to slice.
   A black contour will appear around the selected label.
3. Set an initial point for slicing by clicking on the contour.
4. Draw a line across the label to define the slicing path.
   <br> **Note**: The line cannot cross itself.
   <br> **Note**: The line cannot cross the contour more than twice.
5. Click on the contour (**Alt**+**J**) (outside the contour) to finalize slicing.

![Slicing tool](/images/slicing-tool-02.gif)
