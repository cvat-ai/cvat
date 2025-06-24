---
title: '3D Object annotation (advanced)'
linkTitle: '3D Object annotation'
weight: 5
description: 'Overview of advanced operations available when annotating 3D objects.'
---

As well as 2D-task objects, 3D-task objects support the ability to change appearance, attributes,
properties and have an action menu. Read more in
{{< ilink "/docs/manual/basics/CVAT-annotation-Interface/objects-sidebar" "objects sidebar" >}} section.

## Moving an object

If you hover the cursor over a cuboid and press `Shift+N`, the cuboid will be cut,
so you can paste it in other place (double-click to paste the cuboid).

## Copying

As well as in 2D task you can copy and paste objects by `Ctrl+C` and `Ctrl+V`,
but unlike 2D tasks you have to place a copied object in a 3D space (double click to paste).

  ![Example of copying a cuboid and placing the copy in 3D space](/images/gif030_carla_town3.gif)

## Image of the projection window

You can copy or save the projection-window image by left-clicking on it and selecting a "save image as" or "copy image".

## Cuboid orientation

The feature enables or disables the display of cuboid orientation arrows in the 3D space.
It is controlled by a checkbox located in the appearance block. When enabled, arrows representing
the cuboid's axis orientation (X - red, Y - green, Z - blue) are displayed, providing a visual reference
for the cuboid's alignment within the 3D environment. This feature is useful for understanding the spatial
orientation of the cuboid.

  ![User interface with cuboid projections and orientation elements](/images/cuboid_orientation.gif)


## Cuboid size input

The size input feature allows users to manually specify the dimensions of a cuboid in the 3D space.
This feature is accessible through the objects sidebar - details panel, where you can input precise
values for the width, height, and length (X - width, Y - height, Z - length) of the cuboid.
By entering these values, the cuboid's size is adjusted accordingly to its orientation, providing
greater control and accuracy when annotating objects in 3D tasks.

  ![Example of changing a cuboid size using input fields in sidebar](/images/cuboid_size_input.gif)
