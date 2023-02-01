---
title: 'Context images'
linkTitle: 'Context images'
weight: 26
description: 'Adding  contextual images to a task.'
---

Context images are additional images that provide context or additional information related to the primary image.

You can use context images to provide additional information about the object to improve the accuracy of annotation.

Context images are available for 2D and 3D tasks.

See:

- [Folder structure](#folder-structure)
- [Data format](#data-format)
- [Context images in interface](#context-images-in-interface)


## Folder structure

To add contextual images to the task, you need to organize the images folder properly.
Before uploading the archive to CVAT, do the following:

1. In the folder with the images for annotation, create a folder: `related_images`.
2. Add to the `related_images` a subfolder with the same name as the primary image to which it should be linked.
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
        context_image_for_image_1.pcd
     image_2_to_be_annotated_jpg/
        context_image_for_image_2.pcd
{{< /tab >}}
{{< /tabpane >}}

For more general inormation about 3D data format, see [3D data formats](/docs/manual/basics/create_an_annotation_task/#data-formats-for-a-3d-task).

## Context images in interface

The maximum amount of context images in the interface is twelve.

By default they will be positioned on the right side of the main image:




![contex_images_1](/images/context_img_01.jpg)

![contex_images_1](/images/image212_mapillary_vistas.jpg)

When the image is maximized, you can rotate it clockwise/counterclockwise and zoom in/out.
You can also move the image by moving the mouse while holding down the LMB
and zoom in/out by scrolling the mouse wheel.
To close the image, just click the `X`.

![contex_images_2](/images/image213_mapillary_vistas.jpg)


