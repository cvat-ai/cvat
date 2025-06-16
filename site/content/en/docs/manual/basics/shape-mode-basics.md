---
title: 'Shape mode (basics)'
linkTitle: 'Shape mode'
weight: 17
description: 'Usage examples and basic operations available during annotation in shape mode.'
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
     {{< ilink "/docs/manual/advanced/annotation-with-rectangles" "read here" >}}.

   - It is possible to adjust boundaries and location of the rectangle using a mouse.
     The rectangle's size is shown in the top right corner, you can check it by selecting any point of the shape.
     You can also undo your actions using `Ctrl+Z` and redo them with `Shift+Ctrl+Z` or `Ctrl+Y`.

1. You can see the `Object card` in the objects sidebar or open it by right-clicking on the object.
   You can change the attributes in the details section.
   You can perform basic operations or delete an object by selecting on the action menu button.

   ![Objects sidebar with an example of object settings](/images/image012.jpg)

1. The following figure is an example of a fully annotated frame with separate shapes.

   ![Example of annotated frame with several rectangles](/images/image013_detrac.jpg)

   Read more in the section {{< ilink "/docs/manual/advanced/shape-mode-advanced" "shape mode (advanced)" >}}.
