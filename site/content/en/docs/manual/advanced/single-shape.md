---
title: 'Single Shape'
linkTitle: 'Single Shape Mode'
weight: 3
description: 'Guide to annotating tasks using Single Shape mode'
---

The CVAT Single Shape annotation mode accelerates the annotation process and enhances
workflow efficiency for specific scenarios.

By using this mode you can label objects with a chosen annotation shape and label when an image
contains only a single object. By eliminating the necessity to select tools from the sidebar
and facilitating quicker navigation between images without
the reliance on hotkeys, this feature makes the annotation process significantly faster.

See:

- [Single Shape mode annotation interface](#single-shape-mode-annotation-interface)
- [Annotating in Single Shape mode](#annotating-in-single-shape-mode)
- [Query parameters](#query-parameters)
- [Video tutorial](#video-tutorial)

## Single Shape mode annotation interface

A set of controls in the interface of the **Single Shape** annotation mode may vary depends on different settings.

Images below displays the complete interface, featuring all available fields;
as mentioned above, certain fields may be absent depending on the scenario.

For instance, when annotating
with rectangles, the **Number of points** field will not appear, and if annotating a single class,
the **Labels selector** will be omitted.

To access **Single Shape** mode, open the job, navigate to the
top right corner, and from the drop-down menu, select **Single Shape**.

![Single Shape Annotation Mode Interface](/images/single-shape-interface.png)

The interface will be different if the shape type was set to **Any** in the label **Constructor**:

![Single Shape Annotation Mode Interface](/images/single-shape-label-any.jpg)

The **Single Shape** annotation mode has the following fields:

<!--lint disable maximum-line-length-->

| Feature                          | Explanation                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Prompt for Shape and Label**   | Displays the selected shape and label for the annotation task, for example: "Annotate **cat** on the image using **rectangle**".                                                                                                                                                                                                                                                                                                                  |
| **Skip Button**                  | Enables moving to the next frame without annotating the current one, particularly useful when the frame does not have anything to be annotated.                                                                                                                                                                                                                                                                                                   |
| **List of Hints**                | Offers guidance on using the interface effectively, including: <br> - Click **Skip** for frames without required annotations. <br> - Hold the **Alt** button to avoid unintentional drawing (e.g. when you want only move the image). <br> - Use the **Ctrl+Z** combination to undo the last action if needed. <br> - Use the **Esc** button to completely reset the current drawing progress.                                                |
| **Label selector**               | Allows for the selection of different labels (`cat`, or `dog` in our example) for annotation within the interface.                                                                                                                                                                                                                                                                                                                                |
| **Label type selector**          | A drop-down list to select type of the label (rectangle, ellipse, etc). Only visible when the type of the shape is **Any**.                                                                                                                                                                                                                                                                                                                       |
| **Options to Enable or Disable** | Provides configurable options to streamline the annotation process, such as: <br> - **Automatically go to the next frame**. <br> - **Automatically save when finish**. <br> - **Navigate only empty frames**. <br> - **Predefined number of points** - Specific to polyshape annotations, enabling this option auto-completes a shape once a predefined number of points is reached. Otherwise, pressing **N** is required to finalize the shape. |
| **Number of Points**             | Applicable for polyshape annotations, indicating the number of points to use for image annotation.                                                                                                                                                                                                                                                                                                                                                |

<!--lint enable maximum-line-length-->

## Annotating in Single Shape mode

To annotate in Single Shape mode, follow these steps:

1. Open the job and switch to **Single Shape** mode.
2. Annotate the image based on the selected shape.
   For more information on shapes, see [Annotation Tools](http://localhost:1313/docs/getting_started/overview/#annotation-tools).
3. (Optional) If the image does not contain any objects to annotate,
   click **Skip** at the top of the right panel.
4. Submit your work.

## Query parameters

Also, we introduced additional query parameters, which you may append to
the job link, to initialize the annotation process and automate workflow:

<!--lint disable maximum-line-length-->

| Query Parameter      | Possible Values                                                             | Explanation                                                                                          |
| -------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `defaultWorkspace`   | Workspace identifier (e.g., `single_shape`, `tags`, `review`, `attributes`) | Specifies the workspace to be used initially, streamlining the setup for different annotation tasks. |
| `defaultLabel`       | A string representation of a label (label name)                             | Sets a default label for the annotation session, facilitating consistency across similar tasks.      |
| `defaultPointsCount` | Integer - number of points for polyshapes                                   | Defines a preset number of points for polyshape annotations, optimizing the annotation process.      |

<!--lint enable maximum-line-length-->

You can combine these parameters to customize the workspace for an annotator, for example:

```
/tasks/<tid>/jobs/<jid>?defaultWorkspace=single_shape&defaultLabel=dog&defaultPointsCount=10
```

Will open the following job:

![Query Example](/images/query-example.png)

## Video tutorial

For a better understanding of how Single Shape mode operates,
we recommend watching the following tutorial.

<!--lint disable maximum-line-length-->

<iframe width="560" height="315" src="https://www.youtube.com/embed/u17OXSD7Y4U?si=4z-f52lbxe0CpZEg" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

<!--lint enable maximum-line-length-->
