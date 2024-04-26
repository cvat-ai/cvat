---
title: 'Annotation with skeletons'
linkTitle: 'Annotation with skeletons'
weight: 12
description: 'Guide to annotating tasks using Skeletons'
---

In this guide, we delve into the efficient process of annotating complex
structures through the implementation of **Skeleton** annotations.

**Skeletons** serve as annotation templates
for annotating complex objects with a consistent structure,
such as human pose estimation or facial landmarks.

A **Skeleton** is composed of numerous points (also referred to as elements),
which may be connected by edges. Each point functions as an individual object,
possessing unique attributes and properties like color, occlusion, and visibility.

**Skeletons** can be {{< ilink "/docs/manual/advanced/formats" "**exported**" >}}
in two formats: {{< ilink "/docs/manual/advanced/formats/format-cvat#cvat-for-videos-export" "**CVAT for image**" >}}
and {{< ilink "/docs/manual/advanced/formats/coco-keypoints" "**COCO Keypoints**" >}}.

> **Note**: that skeletons' labels cannot be imported in a label-less project by importing a dataset.
> You need to define the labels manually before the import.

See:

- [Adding Skeleton manually](#adding-skeleton-manually)
  - [Skeleton Configurator](#skeleton-configurator)
  - [Configuring Skeleton points](#configuring-skeleton-points)
  - [Adding Skeleton labels manually](#adding-skeleton-labels-manually)
- [Adding Skeleton labels from the model](#adding-skeleton-labels-from-the-model)
- [Annotation with Skeletons](#annotation-with-skeletons)
- [Automatic annotation with Skeletons](#automatic-annotation-with-skeletons)
- [Editing skeletons on the canvas](#editing-skeletons-on-the-canvas)
- [Editing skeletons on the sidebar](#editing-skeletons-on-the-sidebar)

## Adding Skeleton manually

To start annotating using skeletons, you need to set up a **Skeleton** task
in **Configurator**:

To open **Configurator**, when {{< ilink "/docs/manual/basics/create_an_annotation_task" "creating a task" >}},
click on the **Setup skeleton** button if you want to set up the skeleton manually,
or {{< ilink "/docs/manual/advanced/skeletons#adding-skeleton-labels-from-the-model" "**From model**" >}}
if you want to add skeleton labels from a model.

![](/images/image-setup-skeleton-1.jpg)

### Skeleton Configurator

The skeleton **Configurator** is a tool to build
skeletons for annotation. It has the following fields:

![](/images/image-skeleton-configurator-overview.jpg)

<!--lint disable maximum-line-length-->

| Number | Name                        | Description                                                                                                                           |
| ------ | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **1**  | **Upload background image** | (Optional) Use it to upload a background image, to draw a skeleton on top of it.                                                      |
| **2**  | **Add point**               | Use it to add Skeleton points to the **Drawing area** (**8**).                                                                        |
| **3**  | **Click and drag**          | Use it to move points across the **Drawing area** (**8**).                                                                            |
| **4**  | **Add edge**                | Use it to add edge on the **Drawing area** (**8**) to connect the points (**2**).                                                     |
| **5**  | **Remove point**            | Use it to remove points. Click on **Remove point** and then on any point (**2**) on the **Drawing area** (**8**) to delete the point. |
| **6**  | **Download skeleton**       | Use it to download created skeleton in .SVG format.                                                                                   |
| **7**  | **Upload skeleton**         | Use it to upload skeleton in .SVG format.                                                                                             |
| **8**  | **Drawing area**            | Use it as a canvas to draw a skeleton.                                                                                                |

<!--lint enable maximum-line-length-->

### Configuring Skeleton points

You can name labels, set attributes,
and change the color of each point of the skeleton.

To do this, right-click on the skeleton point and select **Configure**:

![](/images/image-skeleton-drawn-example.jpg)

In the opened menu, you can change the point setting. It is similar to
[adding labels and attributes of the regular task](docs/manual/basics/create_an_annotation_task/#create-a-task):

![](/images/image-skeleton-point-setup.jpg)

A **Skeleton** point can only exist within its parent **Skeleton**.

> **Note** that you cannot change the skeleton configuration for an existing task/project.

> You can copy/insert skeleton configuration from the **Raw** tab of the label configurator.

### Adding Skeleton labels manually

To create the **Skeleton** task, do the following:

1. Open **Configurator**.
2. (Optional) Upload background image.
3. In the Label name field, enter the name of the label.
4. (Optional) {{< ilink "/docs/manual/basics/create_an_annotation_task#add-an-attribute" "**Add attribute**" >}}
   <br>**Note**: you can add attributes exclusively to each point,
   for more information, see [**Configuring Skeleton points**](#configuring-skeleton-points)
5. Use **Add point** to add points to the **Drawing area**.
6. Use **Add edge** to add edges between points.
7. Upload files.
8. Click:
   - **Submit & Open** to create and open the task.
   - **Submit & Continue** to submit the configuration and start creating a new task.

## Adding Skeleton labels from the model

To add points from the model, and annotate do the following:

1. Open **Basic configurator**.
2. On the **Constructor** tab, click **From model**.
3. From the **Select a model to pick labels** select the
   `Human pose estimation` model or others if available.
4. Click on the model's labels, you want to use.
   <br>Selected labels will become gray.

   ![](/images/auto-annot-sk.jpg)

5. (Optional) If you want to adjust labels, within the
   label, click the **Update** attributes icon.
   <br>The {{< ilink "/docs/manual/advanced/skeletons#skeleton-configurator" "**Skeleton configurator**" >}}
   will open, where you can
   {{< ilink "/docs/manual/advanced/skeletons#configuring-skeleton-points" "**configure the skeleton**" >}}.
   <br>**Note**: Labels cannot be adjusted after the task/project is created.
6. Click **Done**. The labels, that you selected,
   will appear in the labels window.
7. Upload data.
8. Click:
   - **Submit & Open** to create and open the task.
   - **Submit & Continue** to submit the configuration and start creating a new task.

## Annotation with Skeletons

To annotate with **Skeleton**, do the following

1. Open job.
2. On the tools panel select **Draw new skeleton**.
3. Select **Track** or **Shape** to annotate.
   without tracking.

   ![](/images/image-draw-new-skeleton.jpg)

4. Draw a skeleton on the image.

![](/images/image-draw-new-skeleton.gif)

## Automatic annotation with Skeletons

To automatically annotate with **Skeleton**, do the following

1. Open the job and on the tools panel select **AI Tools** > **Detectors**
2. From the drop-down list select the model.
   You will see a list of points to match and
   the name of the skeleton on the top of the list.

   ![](/images/auto-annot-sk-detectors.jpg)

3. (Optional) By clicking on the **Bin** icon, you can
   remove any mapped item:
   - A skeleton together with all points.
   - Certain points from two mapped skeletons.
4. Click **Annotate**.

## Editing skeletons on the canvas

A drawn skeleton is encompassed within a bounding box,
it allows you to manipulate the skeleton as a regular bounding box,
enabling actions such as dragging, resizing, or rotating:

![](/images/skeleton_editing_canvas.gif)

Upon repositioning a point, the bounding box adjusts automatically,
without affecting other points:

![](/images/skeleton_editing_canvas-2.gif)

Additionally, **Shortcuts** are applicable
to both the skeleton as a whole and its elements:

- To use a shortcut to the entire skeleton, hover over
  the bounding box and push the shortcut keyboard key.
  This action is applicable for shortcuts like the lock, occluded,
  pinned, keyframe, and outside for skeleton tracks.
- To use a shortcut to a specific skeleton point, hover over the
  point and push the shortcut keyboard key.
  The same list of shortcuts is available, with the addition of outside,
  which is also applicable to individual skeleton shape elements.

## Editing skeletons on the sidebar

In CVAT, the sidebar offers an alternative method for setting
up skeleton properties and attributes.

This approach is similar to that used for other
object types supported by CVAT, but with a few specific alterations:

An additional collapsible section is provided for
users to view a comprehensive list of skeleton parts.

<div style="display: flex; align-items: flex-start;">
    <img src="/images/image-skeleton-track-sidebar.jpg" width="300px" />
    <img src="/images/image-skeleton-shape-sidebar.jpg" width="300px" />
</div>

Skeleton points can have properties like **Outside**, **Occluded**, and **Hidden**.

![](/images/point-properties.jpg)

Both **Outside** and **Hidden** make a skeleton point invisible.

- **Outside** property is part of annotations.
  Use it when part of the object is out of frame borders.

- **Hidden** makes a point hidden only for the annotator's
  convenience, this property will not be saved between different sessions.

- **Occluded** keeps the point visible on the frame and usually
  means that the point is still on a frame, just hidden behind another object.
