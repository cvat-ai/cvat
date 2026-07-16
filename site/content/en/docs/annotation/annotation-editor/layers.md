---
title: 'Layers'
linkTitle: 'Layers'
weight: 7
description: 'Explains how to manage the display order of annotation objects using layers and the Layer Stack.'
---

## What Are Layers in CVAT?

Layers in CVAT are used to manage the display order of objects on the canvas.
Each object is placed on a separate layer,
and the layer's position determines whether the object appears above
or below other objects when they overlap.

Adjusting the display order is especially useful when working with overlapping polygons and masks,
where you need to change how objects are displayed without modifying the annotations themselves.

## Layer Stack Panel

The Layer Stack panel allows you to view and change the layer order.
It's displayed in the sidebar. To open it, do one of the following:

- Click **Open Layer Stack** in the lower-right corner of the canvas.
- Select **Sort by Layer** in the sidebar.

Once open, the panel displays a list of layers for the current frame.

![Layer Stack panel](/images/layer-stack-panel.png)

## Panel Interface

The Layer Stack panel lists objects in the order determined by their assigned layers.
Each layer appears as a layer card; the objects placed on it appear as object cards nested underneath.

![Layer Stack panel interface](/images/layer-stack-interface.png)

| Icon | Element name | Description |
| :---: | --- | --- |
| ![Open Layer Stack icon](/images/open-layer-stack-icon.png) | Open Layer Stack | Opens the Layer Stack panel and displays the number of the active layer. |
| ![Compact layers icon](/images/compact-layers-icon.png) | Compact layers | Renumbers layers starting from 0 while preserving their current order. This is useful when layer numbers become non-consecutive after objects are moved or deleted. |
| ![Collapse or expand all layers icon](/images/collapse-expand-all-layers-icon.png) | Collapse/Expand All Layers | Collapses or expands object cards in the sidebar. When collapsed, only the layers remain visible, making the list more compact. |
| ![Select as current layer icon](/images/select-current-layer-icon.png) | Select as current layer | Hides objects located on layers above the selected layer, so you can focus on editing objects on the current layer and the layers below it. |
| ![Layer number icon](/images/layer-number-icon.png) | Layer number | Displays the layer number. |
| ![Visible layer icon](/images/layer-visible-icon.png)<br>![Hidden layer icon](/images/layer-hidden-icon.png) | Layer visibility status | Displays the current visibility status of the layer on the canvas. |

## Working with Layers

### Moving Objects Using Drag and Drop

Drag an object or layer card in the Layer Stack panel to change its position against other layers on the canvas.
When you drop it, the object (or group of objects) is placed on a new layer created at that position.

1. Click and hold the left mouse button on an object or layer card in the Layer Stack panel.
2. Drag the object or layer to the desired position in the list.
3. Release the mouse button to place the object or layer in the new position.

![Moving an object using drag and drop](/images/drag-and-drop-object.gif)

![Moving a layer using drag and drop](/images/drag-and-drop-layer.gif)

You can also drag an object onto an existing layer to move it there:

1. Click and hold the left mouse button on an object card in the Layer Stack panel.
2. Drag the object card onto the target layer.
3. Release the mouse button so that the object moves to that layer.

![Moving an object to an existing layer](/images/move-object-to-existing-layer.gif)

### Merging layers

Drag one layer onto another to merge them.
All objects from the dragged layer move to the target layer, and the original layer is deleted.

1. Click and hold the left mouse button on a layer card in the Layer Stack panel.
2. Drag the layer onto another layer.
3. Release the mouse button.

![Merging layers](/images/merge-layers.gif)

### Moving an object to background / foreground

These commands move an object to the bottommost layer (**Move to Background**)
or the topmost layer (**Move to Foreground**).
CVAT creates a new layer for the object automatically.

1. Click the **⋮** button on the object card.
2. Select **Move to Background** or **Move to Foreground**.

![Move to Background and Move to Foreground commands](/images/move-to-background-foreground.png)

### Moving an object to one layer backward / forward

These commands move the selected object one layer forward (**Move to One Layer Forward**)
or one layer backward (**Move to One Layer Backward**) on the canvas.

1. Click the **⋮** button on the object card.
2. Select **Move to One Layer Backward** or **Move to One Layer Forward**.

![Move to One Layer Backward and Move to One Layer Forward commands](/images/move-one-layer-backward-forward.png)

### Moving an object to a specific layer

This command moves an object to a layer you specify.

1. Click the **⋮** button on the object card.
2. Select **Move to layer...** from the menu.
3. Enter the number of the layer you want to move the object to.
4. Click **OK**.

![Move to layer command](/images/move-to-layer.png)

### Compacting layers

The **Compact layers** command removes gaps in layer numbering while preserving the current order,
renumbering layers consecutively starting from 0. For example, the sequence 0, 2, 5, 8 becomes 0, 1, 2, 3.

Gaps typically appear after you delete or merge layers, or move objects between them.
Use Compact layers to clean up the numbering:

1. Open the **Layer Stack** panel.
2. Click **Compact layers**.

The layer numbering updates automatically.

![Compact layers result](/images/compact-layers.png)

### Collapse/Expanding layers

This setting allows you to collapse or expand object cards in the Layer Stack panel,
for all layers at once or for an individual layer.
When collapsed, only the layers are listed and the object cards they contain are hidden.
This doesn't affect object visibility on the canvas.

![Collapsing and expanding layers](/images/collapse-expand-layers.gif)

### Displaying Layer Numbers on the Canvas

This setting allows you to display the layer number in an object's text description on the canvas,
so you can identify an object's layer without opening the Layer Stack panel.

![Layer number displayed on the canvas](/images/layer-number-on-canvas.png)

To enable it:

1. Press **F2** to open the settings, then go to the **Workspace** tab.
2. Add the **Layer** parameter to the **Content of a text** field.

The layer number then appears in the text description of each object on the canvas.

![Layer parameter in the Workspace settings](/images/layer-parameter-workspace-settings.png)
