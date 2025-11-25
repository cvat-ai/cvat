---
title: '3D object annotation'
linkTitle: '3D object annotation'
weight: 7
description: 'Overview of basic operations available when annotating 3D objects.'
aliases:
- /docs/manual/basics/3d-object-annotation/
- /docs/manual/advanced/3d-object-annotation-advanced/
- /docs/annotation/tools/3d-object-annotation/
- /docs/annotation/tools/3d-object-annotation-advanced/
- /docs/annotation/tools/standard-3d-mode-basics/
---

Use the 3D Annotation tool for labeling 3D objects and scenes, such as vehicles, buildings, landscapes, and others.

Check out:

- [Navigation](#navigation)
- [Annotation with cuboids](#annotation-with-cuboids)
  - [Annotation with shapes](#annotation-with-shapes)
  - [Tracking with cuboids](#tracking-with-cuboids)

## Navigation

The 3D annotation canvas looks like the following:

![3D canvas](/images/3d-canvas.jpg)

{{% alert title="Note" color="primary" %}}
If you added contextual images to the dataset, the canvas will include them.
For more information, consult {{< ilink
 "/docs/annotation/manual-annotation/utilities/contextual-images" "Contextual images" >}}
{{% /alert %}}

For information on the available tools, consult
{{< ilink "/docs/annotation/annotation-editor/controls-sidebar" "Controls sidebar" >}}.

You can navigate, using the mouse, or navigation keys:

![Navigation keys used in 3D annotation](/images/image216_carla_town3.jpg)

You can also use keyboard shortcuts to navigate:

| Action          | Keys                                          |
| --------------- | --------------------------------------------- |
| Camera rotation | **Shift** + **Arrow** (Up, Down, Left, Right) |
| Left/Right      | **Alt**+**J**/ **Alt**+**L**                  |
| Up/down         | **Al**t+**U**/ **Alt**+**O**                  |
| Zoom in/ou      | **Alt**+**K**/ **Alt**+**I**                  |

## Annotation with cuboids

There are two options available for 3D annotation:

- **Shape**: for tasks like object detection.
- **Track**: uses interpolation to predict the position of objects in subsequent frames.
  A unique ID will be assigned to each object and maintained throughout the sequence of images.

### Annotation with shapes

To add a 3D shape:

1. On the objects pane, select **Draw new cuboid** >
   select the label from the drop-down list > **Shape**.

   ![Opened "Draw new cuboid" window](/images/image217.jpg)

1. The cursor will be followed by a cuboid.
   Place the cuboid on the 3D scene.

   ![Example of placing cuboid on a 3D scene](/images/gif026_carla_town3.gif)

1. Use projections to adjust the cuboid.
   Click and hold the left mouse button to edit the label shape on the projection.

   ![Example of a cuboid adjustment with projections](/images/gif027_carla_town3.gif)

1. (Optional) Move one of the four points to change the size of the cuboid.

   ![Example of a cuboid size change using cuboid points](/images/gif028_carla_town3.gif)

1. (Optional) To rotate the cuboid, select the middle point
   and then drag the cuboid up/down or to left/right.

   ![Example of a cuboid rotation using cuboid middle point](/images/gif029_carla_town3.gif)

### Tracking with cuboids

To track with cuboids:

1. On the objects pane, select **Draw new cuboid** >
   select the label from the drop-down list > **Track**.

1. The cursor will be followed by a cuboid.
   Place the cuboid on the 3D scene.

1. Use projections to adjust the cuboid.
   Select and hold the left mouse button to edit the label shape on the projection.

   ![Adjusting cuboid](/images/gif027_carla_town3.gif)

1. (Optional) Move one of the four points to change the size of the cuboid.

   ![Moving cuboid](/images/gif028_carla_town3.gif)

1. (Optional) To rotate the cuboid, click on the middle point
   and then drag the cuboid up/down or to left/right.

   ![Rotating cuboid](/images/gif029_carla_town3.gif)

1. Move several frames forward. You will see the cuboid you've added in frame 1.
   Adjust it, if needed.

1. Repeat to the last frame with the presence of the object you are tracking.

For more information about tracking, consult {{< ilink
 "/docs/annotation/manual-annotation/shapes/track-mode-basics" "Track mode" >}}.

As well as 2D-task objects, 3D-task objects support the ability to change appearance, attributes,
properties and have an action menu. Read more in
{{< ilink "/docs/annotation/annotation-editor/objects-sidebar" "objects sidebar" >}} section.

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
