---
title: "Getting started"
linkTitle: "Getting started"
weight: 1
---

This section contains basic information and links to sections necessary for a quick start.

## Installation

First step is to install CVAT on your system. Use the [Installation Guide](/docs/administration/basics/installation/).

## Getting started in CVAT

To find out more, go to the [authorization](/docs/manual/basics/authorization/) section.

To create a task, go to `Tasks` section. Click `Create new task` to go to the task creation page.

Set the name of the future task.

Set the label using the constructor: first click "add label", then enter the name of the label and choose the color.

![](/images/create_a_new_task.gif)

You need to upload images or videos for your future annotation. To do so, simply drag and drop the files.

To learn more, go to [creating an annotation task](/docs/manual/basics/creating_an_annotation_task/)

## Basic annotation

When the task is created, you will see a corresponding message in the top right corner.
Click the "Open task" button to go to the task page.

Once on the task page, open a link to the job in the jobs list.

Choose a correct section for your type of the task and start annotation.

| Shape     | Annotation                                                                                | Interpolation                                                                                       |
| --------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Rectangle | [Shape mode (basics)](/docs/manual/basics/shape-mode-basics/)                               | [Track mode (basics)](/docs/manual/basics/track-mode-basics/)                                         |
| Polygon   | [Annotation with polygons](/docs/manual/advanced/annotation-with-polygons/)                | [Track mode with polygons](/docs/manual/advanced/annotation-with-polygons/track-mode-with-polygons/) |
| Polyline  | [Annotation with polylines](/docs/manual/advanced/annotation-with-polylines/)              |                                                                                                     |
| Points    | [Points in shape mode](/docs/manual/advanced/annotation-with-points/points-in-shape-mode/) | [Liner interpolation with one point](/docs/manual/advanced/annotation-with-points/liner-interpolation-with-one-point/) |
| Cuboids   | [Annotation with cuboids](/docs/manual/advanced/annotation-with-cuboids/)                  | [Editing the cuboid](/docs/manual/advanced/annotation-with-cuboids/editing-the-cuboid/)              |
| Tag       | [Annotation with tags](/docs/manual/advanced/annotation-with-tags/)                        |                                                                                                     |

## Dump annotation

![](/images/image028.jpg)

1. To download the annotations, first you have to save all changes.
   Click the Save button or press `Ctrl+S`to save annotations quickly.

2. After you saved the changes, click the Menu button.

3. Then click the Dump Annotation button.

4. Lastly choose a format of the dump annotation file.

To learn more, go to [downloading annotations](/docs/manual/advanced/downloading-annotations/)
