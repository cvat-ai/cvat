---
title: 'Context images'
linkTitle: 'Context images'
weight: 26
description: 'Context images of the task'
---

Context images are additional images that provide
context or additional information related to the primary image.

Use them to add extra context about the object to improve the accuracy of annotation.

Context images are available for 2D and 3D tasks.

See:

- [Folder structure](#folder-structure)
- [Data format](#data-format)
- [Context images](#context-images)

## Folder structure

To add contextual images to the task, you need to organize
the images folder.

Before uploading the archive to CVAT, do the following:

1. In the folder with the images for annotation, create a folder: `related_images`.
2. Add to the `related_images` a subfolder with the same name
   as the primary image to which it should be linked.
3. Place the context image(s) within the subfolder created in step 2.
4. Add folder to the archive.
5. [Create task](/docs/manual/basics/create_an_annotation_task/#create-a-task).

## Data format

Example file structure for 2D and 3D tasks:

{{< tabpane >}}
{{< tab header="2D task" >}}
  root_directory
    image_1_to_be_annotated.jpg
    image_2_to_be_annotated.jpg
    related_images/
      image_1_to_be_annotated_jpg/
        context_image_for_image_1.jpg
      image_2_to_be_annotated_jpg/
        context_image_for_image_2.jpg
     subdirectory_example/
        image_3_to_be_annotated.jpg
         related_images/
          image_3_to_be_annotated_jpg/
             context_image_for_image_3.jpg
{{< /tab >}}
{{< tab header="3D task" >}}
 root_directory
    image_1_to_be_annotated.pcd
    image_2_to_be_annotated.pcd
     related_images/
        image_1_to_be_annotated_pcd/
           context_image_for_image_1.jpg
        image_2_to_be_annotated_pcd/
           context_image_for_image_2.jpg
{{< /tab >}}
{{< /tabpane >}}

For more general information about 3D data formats,
see [3D data formats](/docs/manual/basics/create_an_annotation_task/#data-formats-for-a-3d-task).

## Context images

The maximum amount of context images is twelve.

By default they will be positioned on the right side of the main image.

> **Note:** By default, only three context images will be visible.

![contex_images_1](/images/context_img_01.jpg)

When you add context images to the set, small toolbar will appear on the top of the screen, with the following elements:

<!--lint disable maximum-line-length-->

| Element                                        | Description                                                                                                                                                                                                                        |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ![contex_images_4](/images/context_img_04.jpg) | **Fit views**. Click to restore the layout to its original appearance. <p>If you've expanded any images in the layout, they will returned to their original size. <p>This won't affect the number of context images on the screen. |
| ![contex_images_5](/images/context_img_05.jpg) | **Add new image**. Click to add context image to the layout.                                                                                                                                                                       |
| ![contex_images_6](/images/context_img_06.jpg) | **Reload layout**. Click to reload layout to the default view. <p>Note, that this action can change the number of context images reseting them back to three.                                                                      |

<!--lint enable maximum-line-length-->

Each context image has the following elements:

![contex_images_2](/images/context_img_02.jpg)

<!--lint disable maximum-line-length-->

| Element | Description                                                                                                                             |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1       | **Full screen**. Click to expand the context image in to the full screen mode. <p>Click again to revert context image to windowed mode. |
| 2       | **Move context image**. Hold and move context image to the other place on the screen. <p>![contex_images_3](/images/context_img_03.gif) |
| 3       | **Name**. Unique context image name                                                                                                     |
| 4       | **Select context image**. Click to open a horisontal listview of all available context images. <p>Click on one to select.               |
| 5       | **Close**. Click to remove image from context images menu.                                                         |
| 6       | **Extend** Hold and pull to extend the image.                                                                                           |

<!--lint enable maximum-line-length-->
