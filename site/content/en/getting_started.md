---
title: 'Getting started'
linkTitle: 'Getting started'
weight: 1
type: docs
---

This section contains basic information and links to sections necessary for a quick start.

## Installation

First step is to install CVAT on your system:

- [Installation on Ubuntu](/administration/basics/installation/#ubuntu-1804-x86_64amd64)
- [Installation on Windows 10](/administration/basics/installation/#windows-10)
- [Installation on Mac OS](/administration/basics/installation/#mac-os-mojave)

To learn how to create a superuser and log in to CVAT,
go to the [authorization](/manual/basics/authorization/) section.

## Getting started in CVAT

To create a task, go to `Tasks` section. Click `Create new task` to go to the task creation page.

Set the name of the future task.

Set the label using the constructor: first click `Add label`, then enter the name of the label and choose the color.

![](/images/create_a_new_task.gif)

You need to upload images or videos for your future annotation. To do so, simply drag and drop the files.

To learn more, go to [creating an annotation task](/manual/basics/creating_an_annotation_task/)

## Annotation

### Basic

When the task is created, you will see a corresponding message in the top right corner.
Click the `Open task` button to go to the task page.

Once on the task page, open a link to the job in the jobs list.

Choose a correct section for your type of the task and start annotation.

| Shape     | Annotation                                                                                 | Interpolation                                                                                                          |
| --------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Rectangle | [Shape mode (basics)](/manual/basics/shape-mode-basics/)                              | [Track mode (basics)](/manual/basics/track-mode-basics/)                                                          |
| Polygon   | [Annotation with polygons](/manual/advanced/annotation-with-polygons/)                | [Track mode with polygons](/manual/advanced/annotation-with-polygons/track-mode-with-polygons/)                   |
| Polyline  | [Annotation with polylines](/manual/advanced/annotation-with-polylines/)              |                                                                                                                        |
| Points    | [Points in shape mode](/manual/advanced/annotation-with-points/points-in-shape-mode/) | [Liner interpolation with one point](/manual/advanced/annotation-with-points/liner-interpolation-with-one-point/) |
| Cuboids   | [Annotation with cuboids](/manual/advanced/annotation-with-cuboids/)                  | [Editing the cuboid](/manual/advanced/annotation-with-cuboids/editing-the-cuboid/)                                |
| Tag       | [Annotation with tags](/manual/advanced/annotation-with-tags/)                        |                                                                                                                        |

### Advanced

In CVAT there is the possibility of using automatic and semi-automatic annotation what gives
you the opportunity to speed up the execution of the annotation:

- [OpenCV tools](/manual/advanced/opencv-tools/) - tools included in CVAT by default.
- [AI tools](/manual/advanced/ai-tools/) - tools requiring installation.
- [Automatic annotation](/manual/advanced/automatic-annotation/) - automatic annotation with using DL models.

## Export dataset

![](/images/image028.jpg)

1. To download the annotations, first you have to save all changes.
   Click the `Save` button or press `Ctrl+S`to save annotations quickly.

1. After you saved the changes, click the `Menu` button.

1. Then click the `Export dataset` button.

1. Lastly choose a format of the dataset.
   Exporting is available in formats from the [list of supported formats](/manual/advanced/formats/).

To learn more, go to [export/import datasets](/manual/advanced/export-import-datasets/) section.
