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

## Creating auto annotation Skeleton task

To annotate the **Skeleton** task, do the following:

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
   the name of the skeleton on the top of the list.

   ![](/images/auto-annot-sk-detectors.jpg)

3. (Optional) Remove the point that you
   do not need, by clicking on the
   bin icon.
4. Click **Annotate**.

### Editing skeletons on the canvas

Individual skeleton points can be adjusted independently.

For more information, see [**Editing Skeleton points on canvas**](/docs/manual/advanced/annotation-with-skeletons/manual-skeletons/#editing-skeletons-on-the-canvas).
