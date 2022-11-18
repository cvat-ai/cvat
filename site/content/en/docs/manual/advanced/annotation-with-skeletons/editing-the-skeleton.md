---
title: 'Editing the skeleton'
linkTitle: 'Editing the skeleton'
weight: 2
---

#### Editing skeletons on the canvas

A drawn skeleton is wrapped by a bounding box for a user convenience.
Using this wrapper the user can edit the skeleton as a regular bounding box, by dragging, resizing, or rotating:

![](/images/skeleton_editing_canvas.gif)

Moreover, each the skeleton point can be dragged itself. After dragging, the wrapping bounding box is
adjusted automatically, other points are not affected:

![](/images/skeleton_editing_canvas-2.gif)

You can use `Shortcuts` on both a skeleton itself and its elements.
- Hover the mouse cursor over the bounding box to apply a shortcut on the whole skeleton
(like lock, occluded, pinned, keyframe and outside for skeleton tracks)
- Hover the mouse cursor over one of skeleton points to apply a shortcut to this point
(the same shortcuts list, but **outside is available also for a skeleton shape elements**)

#### Editing skeletons on the sidebar

Using the sidebar is another way to setup skeleton properties, and attributes.
It works a similar way, like for other kinds of objects supported by CVAT, but with some changes:

- A user is not allowed to switch a skeleton label
- `Outside` property is always available for skeleton elements (it does not matter if they are tracks or not)
- Additional collapse is available for a user, to see a list of skeleton parts

<div style="display: flex; align-items: flex-start;">
    <img src="/images/image-skeleton-track-sidebar.jpg" width="300px" />
    <img src="/images/image-skeleton-shape-sidebar.jpg" width="300px" />
</div>


