---
title: 'Multi-object selection'
linkTitle: 'Multi-object selection'
weight: 5
description: 'Select and perform actions on multiple annotation objects.'
---

Multi-object selection allows you to select shapes and tracks in the 2D annotation workspace
and perform supported actions on all selected objects at once.

![Five objects selected on the canvas](/images/multi-object-selection-overview.png)

See:

- [Selecting objects](#selecting-objects)
- [Changing a selection](#changing-a-selection)
- [Moving selected objects](#moving-selected-objects)
- [Selection actions](#selection-actions)
- [Copying and pasting a selection](#copying-and-pasting-a-selection)
- [Undo, redo, and frame navigation](#undo-redo-and-frame-navigation)

## Selecting objects

You can create a multi-object selection from the canvas or the objects sidebar.
A selection can contain one or more objects. CVAT displays a bounding box around the selected objects
and a **SELECTION (N)** label, where `N` is the number of selected objects.

### Selecting objects on the canvas

To select objects with a selection box, do the following:

1. On the {{< ilink "/docs/annotation/annotation-editor/controls-sidebar#navigation" "**Controls sidebar**" >}},
   select **Select objects**.
2. Click an empty area of the canvas and drag a selection box around the objects.
3. Release the mouse button.

![Selecting multiple objects with a selection box](/images/multi-object-selection-canvas.gif)

Only objects fully contained by the selection box are selected.
For rotated objects, CVAT uses the transformed object boundaries.
The **Select objects** tool remains active, so you can draw another selection box without selecting the tool again.

You can also hold **Shift** and start dragging from an empty canvas area while using the **Cursor** tool.
This activates **Select objects** and starts the selection box from the initial pointer position.
If the box selects at least one object, **Select objects** remains active after you release the mouse button.
If the box selects no objects, CVAT returns to the **Cursor** tool.

### Selecting individual objects

While the **Select objects** tool is active, click an object to add it to or remove it from the selection.
The same semantic hit-testing used for regular canvas interaction applies to overlapping objects,
Points objects, and skeletons.

While using the **Cursor** tool, hold the platform selection modifier and click an object:

- On Windows and Linux, use **Ctrl+Click**.
- On macOS, use **Command+Click**.

You can use the modifier on the canvas or on an object card in the **Objects** tab.
When objects overlap, CVAT uses the object under the pointer according to the regular canvas hit-testing rules.

### Selecting objects from the sidebar

The objects sidebar provides the following selection options:

| Location | Action | Result |
| --- | --- | --- |
| **Objects** tab | **Ctrl/Command+Click** an object card | Adds the object to or removes it from the selection. |
| **Objects** tab | **Shift+Click** an object card | Selects the range between the last selected object and the clicked object using the current visible order. |
| **Objects** tab | **Ctrl/Command+A** | Selects all selectable objects visible on the canvas. |
| **Labels** tab | **Ctrl/Command+Click** a label | Adds or removes all selectable objects with that label. |
| **Labels** tab | **Shift+Click** a label | Selects objects for a continuous range of labels. |
| **Layer Stack** | **Ctrl/Command+Click** a layer header | Adds or removes all selectable objects on the layer. |
| **Layer Stack** | **Shift+Click** a layer header | Selects objects from a continuous range of layers. |

![Selecting multiple objects from the objects sidebar](/images/multi-object-selection-sidebar.gif)

Collapsed layers are excluded from object-card range selection.
Hidden, filtered, outside, and hidden-layer objects are not selected.
Tags and individual skeleton elements cannot be added to a multi-object selection.
A Points object is selected as one complete object rather than as separate points.

## Changing a selection

To clear the selection, do one of the following:

- Press **Esc**.
- Click outside the selection while using the **Cursor** tool.
- Click an unselected object without a selection modifier while using the **Cursor** tool
  to return to regular single-object interaction.

Use **Ctrl/Command+Click** to remove individual objects without clearing the rest of the selection.
Hiding an object or its layer removes the object from the active selection.
Undoing the hide action restores both the object's visibility and its previous selection membership.
Showing the object again manually does not add it back to the selection.

## Moving selected objects

To move a selection, drag one of the following:

- The selection bounding box.
- The **SELECTION (N)** label.
- A movable object that belongs to a selection containing multiple objects.

All movable objects are translated by the same distance, preserving their relative positions,
rotations, and layer order.

![Moving multiple selected objects together](/images/multi-object-selection-moving.gif)

Locked, pinned, and ground-truth objects remain selected but do not move.
If the selection contains both movable and stationary objects, only the movable objects are translated.
A selection containing only stationary objects cannot be dragged.

## Selection actions

Open the selection action menu by clicking **⋯** next to **SELECTION (N)**
or by right-clicking the selection bounding box.

![Selection action menu](/images/multi-object-selection-actions-overview.png)

Unavailable actions are disabled when they cannot be applied safely to the selection.
Hover over a disabled action to see why it is unavailable.

### Changing labels

Use the label selector at the top of the menu to apply one label to the complete selection.
The selector contains only labels that are compatible with every selected object.
If the selected objects have different labels, the selector displays **Multiple labels**.

The selector is disabled when no common label is available or when the selection contains
a locked, ground-truth, or skeleton object.

### Changing attributes

Expand **Details** to edit attributes for the complete selection.
This section is available when all selected objects have the same label and that label has attributes.
If an attribute has different values among the selected objects, its control indicates a mixed value.
Selecting a new value applies it to every selected object.

Attributes are read-only when the selection contains a locked or ground-truth object.

![Changing labels and attributes for selected objects](/images/multi-object-selection-labels-attributes.gif)

### Locking and pinning

Select **Lock selection** or **Unlock selection** to change the lock state of all selected objects.
Locking and unlocking are unavailable when the selection contains a ground-truth object.

Select **Pin selection** or **Unpin selection** to change the pinned state of all selected objects.
Pinning and unpinning are unavailable when the selection contains a locked or ground-truth object.

For a selection with mixed lock or pin states, the action changes only the objects needed
to bring the complete selection to the state shown by the action.

![Locking, unlocking, pinning, and unpinning selected objects](/images/multi-object-selection-lock-pin.gif)

### Copying and running annotation actions

Select **Make a copy** to copy the selected objects and start interactive placement.
For details, see [Copying and pasting a selection](#copying-and-pasting-a-selection).

Select **Run annotation action** to open the annotation action dialog with the selected objects
as its input. The dialog provides actions that are compatible with the selected objects.

### Changing the layer order

Use one of the following actions to change the layer order of selected objects:

- **To background** moves them behind the other objects.
- **To foreground** moves them in front of the other objects.
- **To one layer backward** moves each object one layer backward.
- **To one layer forward** moves each object one layer forward.
- **Move to layer ...** moves them to a specified layer.

Layer actions apply only to unlocked, editable shapes and tracks in the selection.
Locked and ground-truth objects remain selected but keep their current layer.
Layer actions are disabled when the selection contains no editable objects.

### Grouping and ungrouping

Select **Group selection** to place the selected objects in one group.
At least two objects must be selected, and the action is disabled if they already belong to the same group.

Select **Ungroup selection** to remove selected objects from their groups.
This action is available when at least one selected object belongs to a group.

### Deleting a selection

Select **Delete selection** to delete all selected objects as one undoable operation.
Regular deletion is rejected when any selected object is locked.
Use **Shift+Delete** or **Shift+Backspace** to force-delete locked selected objects.
Ground-truth objects cannot be deleted.

The regular object shortcuts also work with an active selection.
For example, press **L** to lock or unlock the selection, **P** to pin or unpin it,
and use a configured label shortcut to change the label when it is compatible with every selected object.

## Copying and pasting a selection

Press **Ctrl+C** on Windows or Linux, or **Command+C** on macOS, to copy the selected objects.
Press **Ctrl+V** or **Command+V** to start interactive placement.

CVAT displays transparent preview objects. Move the pointer to the required position and click to place the selection.
The new objects preserve their relative geometry, labels, attributes, object types, rotations, groups,
lock and pin states, and instance colors. Pasted objects become the active selection.

![Copying and pasting multiple selected objects](/images/multi-object-selection-copy-paste.gif)

## Undo, redo, and frame navigation

Selection membership changes and supported batch operations are recorded in annotation history.
Undo and redo restore selection changes, movement, deletion, paste, label and attribute changes,
lock and pin changes, grouping, and layer changes.

On Windows and Linux, use **Ctrl+Z** to undo and **Ctrl+Shift+Z** or **Ctrl+Y** to redo.
On macOS, use **Command+Z** to undo and **Command+Shift+Z** to redo.

When you change frames, selected frame-local shapes are removed from the selection.
Selected tracks remain selected if they are visible and available on the destination frame.
Outside, hidden, filtered, and hidden-layer tracks are removed from the selection.
