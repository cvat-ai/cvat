---
title: 'Multi-selection of shapes'
linkTitle: 'Multi-selection'
weight: 12
description: 'Selecting several shapes at once to move, copy, paste, or delete them together.'
---

In the standard workspace you can select several shapes at once and
manipulate them as a group.

## Selecting shapes

Hold `Shift` and drag with the left mouse button over the canvas in cursor
mode. Every shape whose bounding box intersects the selection box becomes
selected. Selected shapes are highlighted on the canvas and in the objects
sidebar.

The modifier key is rebindable: search for `Multi-selection modifier` in the
shortcut settings (supported values are `shift`, `ctrl`, `alt` and `meta`).

To reset the selection, click anywhere outside of the selected shapes.
The selection is also reset when you switch to another frame.

## Manipulating the selection

- **Move**: drag any of the selected shapes — the whole selection moves
  with it. Shapes that are pinned can also be dragged this way while they
  are part of the selection.
- **Copy and paste**: press `Ctrl+C` to copy the selection and `Ctrl+V` to
  paste it. The relative positions of the copied shapes are preserved, and
  the pasted shapes become the new selection, so they can be dragged into
  place right away. The clipboard survives frame changes — you can copy
  shapes on one frame and paste them on another.
- **Delete**: press `Del` to remove all selected shapes
  (`Shift+Del` to remove them even if they are locked).

Moving, pasting, or deleting a selection is registered as a single action
in the annotation history, so one `Ctrl+Z` reverts the whole operation.
