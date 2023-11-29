---
title: 'Manual annotation with Skeletons'
linkTitle: 'Manual annotation with Skeletons'
weight: 1
description: 'Manual annotation with Skeletons'
---

In this guide, we delve into the efficient process of annotating complex
structures through the implementation of **Skeleton** annotations.

Ideal for scenarios like human pose estimation and
facial landmark detection, skeleton annotations offer a
structured and precise approach to marking intricate
details in images and videos.

See:

- [Skeleton task](#skeleton-task)
  - [Creating Skeleton task](#creating-skeleton-task)
  - [Configuring Skeleton points](#configuring-skeleton-points)
- [Annotation with Skeletons](#annotation-with-skeletons)
  - [Editing skeletons on the canvas](#editing-skeletons-on-the-canvas)
  - [Editing skeletons on the sidebar](#editing-skeletons-on-the-sidebar)

## Skeleton task

To start annotating using skeletons, you need to setup a **Skeleton** task
in **Configurator**:

To open **Configurator**, when [creating a task](/docs/manual/basics/create_an_annotation_task/),
click on the **Setup skeleton** button.

![](/images/image-setup-skeleton-1.jpg)

The skeleton **Configurator** has the following fields:

![](/images/image-skeleton-configurator-overview.jpg)

<!--lint disable maximum-line-length-->

| Number | Name                        | Description                                                                                                                           |
| ------ | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **1**  | **Upload background image** | (Optional) Use it to upload a background image, to draw a skeleton on the top of it.                                                  |
| **2**  | **Add point**               | Use it to add Skeleton points to the **Drawing area** (**8**).                                                                        |
| **3**  | **Click and drag**          | Use it to move points across the **Drawing area** (**8**).                                                                            |
| **4**  | **Add edge**                | Use it to add edge on the **Drawing area** (**8**) to connect the points (**2**).                                                     |
| **5**  | **Remove point**            | Use it to remove points. Click on **Remove point** and then on any point (**2**) on the **Drawing area** (**8**) to delete the point. |
| **6**  | **Download skeleton**       | Use it to download created skeleton in .SVG format.                                                                                   |
| **7**  | **Upload skeleton**         | Use it to upload skeleton in .SVG format.                                                                                             |
| **8**  | **Drawing area**            | Use it as a canvas to draw a skeleton.                                                                                                |

<!--lint enable maximum-line-length-->

### Creating Skeleton task

To create **Skeleton** task, do the following:

1. Open **Configurator**.
2. (Optional) Upload background image.
3. In the Label name field, enter the name of the label.
4. (Optional) [**Add attribute**](/docs/manual/basics/create_an_annotation_task/#add-an-attribute)
   <br>Note: you can add attributes exclusively to each point,
   for more information, see [**Configuring Skeleton points**](#configuring-skeleton-points)
5. Use **Add point** to add points to the **Drawing area**.
6. Use **Add edge** to add edges between points.
7. Upload files.
8. Click:
   - **Submit & Open** to create and open the task.
   - **Submit & Continue** to submit the configuration and start creating a new task.

### Configuring Skeleton points

You can name label, setup attributes, and change colour of each point of the skeleton.

To do this, right-click on the skeleton point and select **Configure**:

![](/images/image-skeleton-drawn-example.jpg)

In the opened menu, you can change the point setting. It is similar to
[adding labels and attributes of the regular task](docs/manual/basics/create_an_annotation_task/#create-a-task):

![](/images/image-skeleton-point-setup.jpg)

> **Note** that you cannot change skeleton configuration for an existing task/project.

> You can copy/insert skeletons configuration from the **Raw** tab of the label configurator.

## Annotation with Skeletons

To annotate with **Skeleton**, do the following

1. Open job.
2. On the tools panel select **Draw new skeleton**.
3. Select **Track** to track object or **Shape** to annotate
   without tracking.

   ![](/images/image-draw-new-skeleton.jpg)

4. Draw a skeleton on the image.

![](/images/image-draw-new-skeleton.gif)

### Editing skeletons on the canvas

A drawn skeleton is encompassed within a bounding box,
it allows you to manipulate the skeleton as a regular bounding box,
enabling actions such as dragging, resizing, or rotating:

![](/images/skeleton_editing_canvas.gif)

Furthermore, individual skeleton points can be adjusted independently.
Upon repositioning a point, the bounding box adjusts automatically,
without affecting other points:

![](/images/skeleton_editing_canvas-2.gif)

Additionally, **Shortcuts** are applicable
to both the skeleton as a whole and its individual elements:

- To use a shortcut to the entire skeleton, hover over
  the bounding box and push the shortcut keyboard key.
  This action is applicable for shortcuts like lock, occluded,
  pinned, keyframe, and outside for skeleton tracks.
- To use a shortcut to a specific skeleton point, hover over the
  point and push the shortcut keyboard key.
  The same list of shortcuts is available, with the addition of outside,
  which is also applicable to individual skeleton shape elements.

### Editing skeletons on the sidebar

In CVAT, the sidebar offers an alternative method for setting up skeleton properties and attributes.
This approach is similar to that used for other object types supported by CVAT, but with a few specific alterations:

- Users cannot change the label of a skeleton.
- The `Outside` property is consistently accessible for all skeleton elements, regardless of whether they are tracks.
- An additional collapsible section is provided for users to view a comprehensive list of skeleton parts.

<div style="display: flex; align-items: flex-start;">
    <img src="/images/image-skeleton-track-sidebar.jpg" width="300px" />
    <img src="/images/image-skeleton-shape-sidebar.jpg" width="300px" />
</div>
