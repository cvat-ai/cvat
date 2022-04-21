---
title: 'Context images for 2d task'
linkTitle: 'Context images'
weight: 25
description: 'Adding additional contextual images to a task.'
---

When you create a task, you can provide the images with additional contextual images.
To do this, create a folder related_images and place a folder with a contextual image in it
(make sure the folder has the same name as the image to which it should be tied).
An example of the structure:

- root_directory
  - image_1_to_be_annotated.jpg
  - image_2_to_be_annotated.jpg
  - related_images/
    - image_1_to_be_annotated_jpg/
      - context_image_for_image_1.jpg
    - image_2_to_be_annotated_jpg/
      - context_image_for_image_2.jpg
  - subdirectory_example/
    - image_3_to_be_annotated.jpg
    - related_images/
      - image_3_to_be_annotated_jpg/
        - context_image_for_image_3.jpg

The contextual image is displayed in the upper right corner of the workspace.
You can hide it by clicking on the corresponding button or maximize the image by clicking on it.

![contex_images_1](/images/image212_mapillary_vistas.jpg)

When the image is maximized, you can rotate it clockwise/counterclockwise and zoom in/out.
You can also move the image by moving the mouse while holding down the LMB
and zoom in/out by scrolling the mouse wheel.
To close the image, just click the `X`.

![contex_images_2](/images/image213_mapillary_vistas.jpg)

