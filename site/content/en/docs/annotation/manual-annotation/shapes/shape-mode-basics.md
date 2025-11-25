---
title: 'Shape mode'
linkTitle: 'Shape mode'
weight: 1
description: 'Usage examples and basic operations available during annotation in shape mode.'
aliases:
- /docs/manual/basics/shape-mode-basics/
- /docs/manual/advanced/shape-mode-advanced/
- /docs/annotation/tools/shape-mode-basics/
- /docs/annotation/tools/shape-mode-advanced/
---

Usage examples:

- Create new annotations for a set of images.
- Add/modify/delete objects for existing annotations.

1. You need to select `Rectangle` on the controls sidebar:

   !["Rectangle" button highlighted in user interface](/images/image082.jpg)

   Before you start, select the correct ` Label` (should be specified by you when creating the task)
   and ` Drawing Method` (by 2 points or by 4 points):

   !["Draw new rectangle" window with highlighted "Label" and "Track" options](/images/image080.jpg)

1. Creating a new annotation in `Shape mode`:

   - Create a separate `Rectangle` by selecting `Shape`.

     !["Draw new rectangle" window with highlighted "Shape" option](/images/image081.jpg)

   - Choose the opposite points. Your first rectangle is ready!

     ![Several frames demonstrating the creation of a rectangle shape](/images/image011_detrac.jpg)

   - To learn more about creating a rectangle
     {{< ilink "/docs/annotation/manual-annotation/shapes/annotation-with-rectangles" "read here" >}}.

   - It is possible to adjust boundaries and location of the rectangle using a mouse.
     The rectangle's size is shown in the top right corner, you can check it by selecting any point of the shape.
     You can also undo your actions using `Ctrl+Z` and redo them with `Shift+Ctrl+Z` or `Ctrl+Y`.

1. You can see the `Object card` in the objects sidebar or open it by right-clicking on the object.
   You can change the attributes in the details section.
   You can perform basic operations or delete an object by selecting on the action menu button.

   ![Objects sidebar with an example of object settings](/images/image012.jpg)

1. The following figure is an example of a fully annotated frame with separate shapes.

   ![Example of annotated frame with several rectangles](/images/image013_detrac.jpg)

**Occluded**
Occlusion is an attribute used if an object is occluded by another object or
isn't fully visible on the frame. Use `Q` shortcut to set the property
quickly.

![Objects sidebar with highlighted button for occluding objects](/images/image065.jpg)

Example: the three cars on the figure below should be labeled as **occluded**.

![Example of an occluded object on an annotation](/images/image054_mapillary_vistas.jpg)

If a frame contains too many objects and it is difficult to annotate them
due to many shapes placed mostly in the same place, it makes sense
to lock them. Shapes for locked objects are transparent, and it is easy to
annotate new objects. Besides, you can't change previously annotated objects
by accident. Shortcut: `L`.

![Objects sidebar with highlighted button for locking objects](/images/image066.jpg)
