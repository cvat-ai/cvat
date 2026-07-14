---
title: 'Layers'
linkTitle: 'Layers'
weight: 7
description: 'Explains how to manage the display order of annotation objects using layers and the Layer Stack.'
---

## What Are Layers in CVAT?

Layers are used to manage the display order of objects on the canvas.
Each object is placed on a separate layer,
and the layer's position determines whether the object appears above or below other objects when they overlap.

The **Layer Stack** panel allows you to view and change the layer order.
This is especially useful when working with overlapping polygons and masks,
where you need to adjust the display order of objects without modifying the annotations themselves.

## Layer Stack Panel

**Description**

The **Layer Stack** panel is displayed in the sidebar.

To open the panel, do one of the following:

- Click **Open Layer Stack** in the lower-right corner of the canvas.
- Select **Sort by Layer** in the sidebar.

After the panel opens, it displays a list of layers for the current frame.

![Layer Stack panel](/images/layer-stack-panel.png)

## Panel Interface

**Description**

The **Layer Stack** panel displays objects according to their actual order based on their assigned layers.

![Layer Stack panel interface](/images/layer-stack-interface.png)

| Icon | Element name | Description |
| :---: | --- | --- |
| ![Open Layer Stack icon](/images/open-layer-stack-icon.png) | **Open Layer Stack** | Opens the **Layer Stack** panel and displays the number of the active layer. |
| ![Compact layers icon](/images/compact-layers-icon.png) | **Compact layers** | Renumbers layers starting from 0 while preserving their current order. This is useful when layer numbers become non-consecutive after objects are moved or deleted, for example, 0, 2, 5, 8. After running the command, the numbering becomes consecutive: 0, 1, 2, 3, and so on. |
| ![Collapse or expand all layers icon](/images/collapse-expand-all-layers-icon.png) | **Collapse/Expand All Layers** | Collapses or expands object cards in the sidebar. When collapsed, only the layers remain visible, making the list more compact. |
| ![Select as current layer icon](/images/select-current-layer-icon.png) | **Select as current layer** | Hides objects located on layers above the selected layer. This allows you to focus on editing objects on the current layer and the layers below it. |
| ![Layer number icon](/images/layer-number-icon.png) | **Layer number** | Displays the layer number. |
| ![Visible layer icon](/images/layer-visible-icon.png)<br>![Hidden layer icon](/images/layer-hidden-icon.png) | **Layer visibility status** | Displays the current visibility status of the layer on the canvas. |

## Working with Layers

### Moving Objects Using Drag and Drop

**Description**

Allows you to change the position of an object or a group of objects
in the layer order by dragging them in the **Layer Stack** panel.
When moved, the object or group of objects is placed on a new layer created at the selected position.

**Procedure**

1. Click and hold the left mouse button on an object or layer card in the **Layer Stack** panel.
2. Drag the object or layer to the desired position in the list.
3. Release the mouse button to change its position in the layer order.

![Moving an object using drag and drop](/images/drag-and-drop-object.gif)

![Moving a layer using drag and drop](/images/drag-and-drop-layer.gif)

You can also move an object to an existing layer.

**Procedure**

1. Click and hold the left mouse button on an object card in the **Layer Stack** panel.
2. Drag the object card into the desired layer.
3. Release the mouse button. The object will be moved to the selected layer.

![Moving an object to an existing layer](/images/move-object-to-existing-layer.gif)

### Merge Layers

**Description**

Using drag and drop, you can merge two layers by moving all objects from one layer to another.

**Procedure**

1. Click and hold the left mouse button on a layer card in the **Layer Stack** panel.
2. Drag the layer into another layer.
3. Release the mouse button. All objects from the selected layer will be moved to the target layer,
   and the original layer will be deleted.

![Merging layers](/images/merge-layers.gif)

### Move to Background / Foreground

#**Description**

Allows you to move an object to the bottommost layer (**Move to Background**)
or the topmost layer (**Move to Foreground**).
A new layer is automatically created for the object when the command is performed.

**Procedure**

1. Click the **⋮** button on the object card.
2. Select **Move to Background** or **Move to Foreground**.

![Move to Background and Move to Foreground commands](/images/move-to-background-foreground.png)

### Move to One Layer Backward / Forward

**Description**

Allows you to move the selected object one layer forward (**Move to One Layer Forward**)
or one layer backward (**Move to One Layer Backward**) in the layer order.

**Procedure**

1. Click the **⋮** button on the object card.
2. Select **Move to One Layer Backward** or **Move to One Layer Forward**.

![Move to One Layer Backward and Move to One Layer Forward commands](/images/move-one-layer-backward-forward.png)

### Move to Layer...

**Description**

Allows you to move an object to a specified layer.

**Procedure**

1. Click the **⋮** button on the object card.
2. Select **Move to layer...** from the menu.
3. Enter the number of the layer to which you want to move the object.
4. Click **OK**.

![Move to layer command](/images/move-to-layer.png)

### Compact Layers

**Description**

The **Compact layers** function removes gaps in layer numbering while preserving the current layer order.
After the command is performed, the layers are renumbered consecutively starting from 0.
For example, the sequence 0, 2, 5, 8 is converted to 0, 1, 2, 3.

**When to Use It**

Use **Compact layers** when gaps appear in the layer numbering, for example:

- After deleting layers.
- After merging layers.
- After moving objects or layers.

**Procedure**

1. Open the **Layer Stack** panel.
2. Click **Compact layers**.
3. The layer numbering will be updated automatically.

![Compact layers result](/images/compact-layers.png)

### Collapse/Expand Layers

**Description**

Allows you to collapse or expand object cards in the **Layer Stack** panel
for all layers at once or for an individual layer.

When collapsed, only the layers are displayed in the list, while the cards of the objects they contain are hidden.
This does not affect the visibility of objects on the canvas.

![Collapsing and expanding layers](/images/collapse-expand-layers.gif)

### Displaying Layer Numbers on the Canvas

**Description**

Allows you to display the layer number in an object's text description on the canvas.
This helps you quickly identify the layer on which an object is located without opening the **Layer Stack** panel.

![Layer number displayed on the canvas](/images/layer-number-on-canvas.png)

#### Enabling Layer Number Display

1. Press **F2** to open the settings, then go to the **Workspace** tab.
2. Add the **Layer** parameter to the **Content of a text** field.

The layer number will then be displayed in the text description of each object on the canvas.

![Layer parameter in the Workspace settings](/images/layer-parameter-workspace-settings.png)
