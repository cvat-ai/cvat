---
title: 'Getting started'
linkTitle: 'Getting started'
weight: 1
---

To install and set up CVAT:

1. Install CVAT
1. Create a superuser
1. Creat a task
1. Create an annotation
1. Export dataset
1. See also

## Install CVAT

{{< tabpane >}}
  {{< tab header="Ubuntu" >}}
   {% include [Ubuntu](../docs/administration/basics/installation.md#ubuntu-1804-x8664amd64) %}
  {{< /tab >}}
  {{< tab header="Windows" >}}
   {% include [Windows](../docs/administration/basics/installation.md#windows-10) %}
  {{< /tab >}}
  {{< tab header="Mac OS" >}}
    {% include [MacOS](../docs/administration/basics/installation.md#mac-os-mojave) %}
  {{< /tab >}}
{{< /tabpane >}}

## Create a superuser {#superuser}

{% include notitle [authorization](../docs/manual/basics/authorization.md) %}

## Create a task {#create-task}

1. Open the **Tasks** section.
1. Click **Create new task**.
1. Set the name of the task.
1. Set the label:
    1.1 Click **Add label**;
    1.1 Enter the name;
    1.1 Choose the color.

![](/images/create_a_new_task.gif)
When the task is created, you see a corresponding message in the top right corner.

1. Drag and drop images or videos for the annotation.

## Annotation {#create-annotation}

### Basic

1. Click `Open task`.
1. Choose a job in the jobs list.
1. Choose a correct section for the type of the task.
1. Start annotation.

| Shape     | Annotation                                                                                 | Interpolation                                                                                                          |
| --------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Rectangle | [Shape mode (basics)](/docs/manual/basics/shape-mode-basics/)                              | [Track mode (basics)](/docs/manual/basics/track-mode-basics/)                                                          |
| Polygon   | [Annotation with polygons](/docs/manual/advanced/annotation-with-polygons/)                | [Track mode with polygons](/docs/manual/advanced/annotation-with-polygons/track-mode-with-polygons/)                   |
| Polyline  | [Annotation with polylines](/docs/manual/advanced/annotation-with-polylines/)              |                                                                                                                        |
| Points    | [Points in shape mode](/docs/manual/advanced/annotation-with-points/points-in-shape-mode/) | [Liner interpolation with one point](/docs/manual/advanced/annotation-with-points/liner-interpolation-with-one-point/) |
| Cuboids   | [Annotation with cuboids](/docs/manual/advanced/annotation-with-cuboids/)                  | [Editing the cuboid](/docs/manual/advanced/annotation-with-cuboids/editing-the-cuboid/)                                |
| Tag       | [Annotation with tags](/docs/manual/advanced/annotation-with-tags/)                        |                                                                                                                        |

### Advanced

In CVAT there is the possibility of using automatic and semi-automatic annotation what gives you the opportunity to speed up the execution of the annotation:

- [OpenCV tools](/docs/manual/advanced/opencv-tools/) - tools included in CVAT by default.
- [AI tools](/docs/manual/advanced/ai-tools/) - tools requiring installation.
- [Automatic annotation](/docs/manual/advanced/automatic-annotation/) - automatic annotation with using DL models.

## Export dataset

![](/images/image028.jpg)

1. Click **Save** or press _Ctrl+S_.
1. Click **Menu**.
1. Click **Export dataset**.
1. Choose a format of the dataset from the [list of supported formats](/docs/manual/advanced/formats/).


## See also:
  *  [Export and import datasets](../docs/manual/advanced/export-import-datasets.md)
  *  [Creating an annotation task](../docs/manual/basics/creating_an_annotation_task.md)
