---
title: 'Automatic annotation with Skeletons'
linkTitle: 'Automatic annotation with Skeletons'
weight: 2
description: 'Automatic annotation with Skeletons'
---

In this guide, we delve into the efficient process of annotating complex
structures through the implementation of **Skeleton** automatic annotations.

See:

- [Creating auto annotation Skeleton task](#creating-auto-annotation-skeleton-task)
- [Automatic annotation with Skeletons](#automatic-annotation-with-skeletons)
  - [Editing skeletons on the canvas](#editing-skeletons-on-the-canvas)
  - [Editing skeletons on the sidebar](#editing-skeletons-on-the-sidebar)

## Creating auto annotation Skeleton task

To auto annotation **Skeleton** task, do the following:

1. Open **Basic configurator**.
2. On the **Constructor** tab, click **From model**.
3. From the **Select a model to pick labels** select the model
   you want to use.
4. Click on the model's labels, you want to use.
   Selected labels will become gray.

   ![](/images/auto-annot-sk.jpg)

5. Click **Done**. Labels, that you selected,
   will appear in the labels window.
6. (Optional) If you want to adjust labels, within the
   label, click the **Update** attributes icon.
   <br>The [Skeleton configurator](/docs/manual/advanced/annotation-with-skeletons/manual-skeletons/#skeleton-task)
   will open, where you can [configure the skeleton](/docs/manual/advanced/annotation-with-skeletons/manual-skeletons/#configuring-skeleton-points).
7. Upload data.
8. Click:
   - **Submit & Open** to create and open the task.
   - **Submit & Continue** to submit the configuration and start creating a new task.

## Automatic annotation with Skeletons

To automatically annotate with **Skeleton**, do the following

1. Open job and on the tools panel select **AI Tools** > **Detectors**
2. From the drop-down list select model.
   You will see list of points to match and
   the name of the label on the top of the list.

   ![](/images/auto-annot-sk-detectors.jpg)

3. (Optional) Remove point that you
   do not need, by clicking on the
   bin icon.
4. Click **Annotate**.

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

Шn CVAT, the sidebar offers an alternative method for setting up skeleton properties and attributes.
This approach is similar to that used for other object types supported by CVAT, but with a few specific alterations:

- Users cannot change the label of a skeleton.
- The `Outside` property is consistently accessible for all skeleton elements, regardless of whether they are tracks.
- An additional collapsible section is provided for users to view a comprehensive list of skeleton parts.

<div style="display: flex; align-items: flex-start;">
    <img src="/images/image-skeleton-track-sidebar.jpg" width="300px" />
    <img src="/images/image-skeleton-shape-sidebar.jpg" width="300px" />
</div>
