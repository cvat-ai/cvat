---
title: '3D Object annotation'
linkTitle: '3D Object annotation'
weight: 19
description: 'Overview of basic operations available when annotating 3D objects.'
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
For more information, consult {{< ilink "/docs/manual/advanced/contextual-images" "Contextual images" >}}
{{% /alert %}}

For information on the available tools, consult
{{< ilink "/docs/manual/basics/CVAT-annotation-Interface/controls-sidebar" "Controls sidebar" >}}.

You can navigate, using the mouse, or navigation keys:

![Navigation keys used in 3D annotation](/images/image216_carla_town3.jpg)

You can also use keyboard shortcuts to navigate:

<!--lint disable maximum-line-length-->

| Action          | Keys                                          |
| --------------- | --------------------------------------------- |
| Camera rotation | **Shift** + **Arrow** (Up, Down, Left, Right) |
| Left/Right      | **Alt**+**J**/ **Alt**+**L**                  |
| Up/down         | **Al**t+**U**/ **Alt**+**O**                  |
| Zoom in/ou      | **Alt**+**K**/ **Alt**+**I**                  |

<!--lint enable maximum-line-length-->

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

For more information about tracking, consult {{< ilink "/docs/manual/basics/track-mode-basics" "Track mode" >}}.
