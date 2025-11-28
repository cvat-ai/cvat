---
title: 'Contextual images'
linkTitle: 'Contextual images'
weight: 3
description: 'Contextual images of the task'
aliases:
- /docs/manual/advanced/contextual-images/
- /docs/annotation/tools/contextual-images/
---

Contextual images (or related images) are additional images that provide
context or additional information related to the primary image.

Use them to add extra contextual about the object to improve the accuracy of annotation.

Contextual images are available for 2D and 3D tasks.

See:

- [Folder structure](#folder-structure)
- [Contextual images](#contextual-images)

## Folder structure

To add contextual images to the task, you need to organize the images folder into one of
the supported file layouts. A task with contextual images can be created both from an archive
or from raw files.

Example for 2D tasks:

1. In the folder with the images for annotation, create a folder: `related_images`.
2. Add to the `related_images` a subfolder with the same name
   as the primary image to which it should be linked.
3. Place the contextual image(s) within the subfolder created in step 2.
4. Add folder to the archive.
5. {{< ilink "/docs/workspace/tasks-page#create-annotation-task" "Create task" >}}.

Supported file layouts for 2D and 3D tasks:

{{< tabpane text=true >}}
{{% tab header="2D task" %}}

```
root_directory/
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
```

{{% /tab %}}
{{% tab header="3D option 1" %}}

Point clouds and related images are put into the same directory. Related files must have the same
names as the corresponding point clouds. This format is limited by only 1 related image
per point cloud.

```
root_directory/
  pointcloud1.pcd
  pointcloud1.jpg
  pointcloud2.pcd
  pointcloud2.png
  ...
```

{{% /tab %}}
{{% tab header="3D option 2" %}}

Each point cloud is put into a separate directory with matching file name. Related images
are put next to the corresponding point cloud, the file names and extensions can be arbitrary.

```
root_directory/
  pointcloud1/
    pointcloud1.pcd
    pointcloud1_ri1.png
    pointcloud1_ri2.jpg
    ...
  pointcloud2/
    pointcloud2.pcd
    pointcloud2_ri1.bmp
```

{{% /tab %}}
{{% tab header="3D task KITTI format" %}}

Context images are placed in the `image_00/`, `image_01/`, `image_N/` (`N` is any number)
directories. Their file names must correspond to the point cloud files in the `data/` directory.

```
image_00/
  data/
    0000000000.png
    0000000001.png
    0000000002.png
    0000000003.png
image_01/
  data/
    0000000000.png
    0000000001.png
    0000000002.png
    0000000003.png
image_N/
  data/
    0000000000.png
    0000000001.png
    0000000002.png
    0000000003.png
velodyne_points/
  data/
    0000000000.bin
    0000000001.bin
    0000000002.bin
    0000000003.bin
```

{{% /tab %}}
{{% tab header="3D task Supervisely format" %}}

```
root_directory/
  pointcloud/
    pointcloud1.pcd
    pointcloud2.pcd
  related_images/
    pointcloud1_pcd/
      context_image_for_pointclud1.jpg
    pointcloud2_pcd/
      context_image_for_pointcloud2.jpg
```

{{% /tab %}}
{{< /tabpane >}}

For more general information about 3D data formats,
see {{< ilink "/docs/workspace/tasks-page#data-formats-for-a-3d-task" "3D data formats" >}}.

## Contextual images

The maximum amount of contextual images is twelve.

By default they will be positioned on the right side of the main image.

{{% alert title="Note" color="primary" %}}
By default, only three contextual images will be visible.
{{% /alert %}}

![context_images_1](/images/context_img_01.jpg)

When you add contextual images to the set,
small toolbar will appear on the top of the screen, with the following elements:

| Element                                        | Description |
| ---------------------------------------------- | ----------- |
| ![context_images_4](/images/context_img_04.jpg) | **Fit views**. Click to restore the layout to its original appearance. <p>If you've expanded any images in the layout, they will returned to their original size. <p>This won't affect the number of context images on the screen. |
| ![context_images_5](/images/context_img_05.jpg) | **Add new image**. Click to add context image to the layout. |
| ![context_images_6](/images/context_img_06.jpg) | **Reload layout**. Click to reload layout to the default view. <p>Note, that this action can change the number of context images resetting them back to three. |

Each context image has the following elements:

![context_images_2](/images/context_img_02.jpg)

| Element | Description                                                                                                                             |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1       | **Full screen**. Click to expand the contextual image in to the full screen mode. <p>Click again to revert contextual image to windowed mode. |
| 2       | **Move contextual image**. Hold and move contextual image to the other place on the screen. <p>![context_images_3](/images/context_img_03.gif) |
| 3       | **Name**. Unique contextual image name                                                                                                     |
| 4       | **Select contextual image**. Click to open a horizontal listview of all available contextual images. <p>Click on one to select.               |
| 5       | **Close**. Click to remove image from contextual images menu.                                                         |
| 6       | **Extend** Hold and pull to extend the image.                                                                                           |
