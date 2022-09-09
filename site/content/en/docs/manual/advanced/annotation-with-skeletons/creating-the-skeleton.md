---
title: "Creating the skeleton"
linkTitle: "Creating the skeleton"
weight: 1
---

#### Initial skeleton setup

Unlike other CVAT objects, to start annotating using skeletons, first of all you need to setup a skeleton.
You can do that in the label configurator during creating a task/project, or later in created instances.

So, start by clicking `Setup skeleton` option:

![](/images/image-setup-skeleton-1.jpg)

Below the regular label form where you need to add a name, and setup attributes if necessary,
you will see a drawing area with some buttons aside:

![](/images/image-skeleton-configurator-overview.jpg)

- PUT AN IMAGE AS A BACKGROUND - is a helpful feature you can use to draw a skeleton template easier,
seeing an example - object you need to annotate in the future.
- PUT NEW SKELETON POINTS - is activated by default.
It is a mode where you can add new skeleton points clicking the drawing area.
- DRAW AN EDGE BETWEEN TWO POINTS - in this mode you can add an edge,
clicking any two points, which are not joined yet.
- REMOVE A DRAWN SKELETON POINTS - in this mode clicking a point will remove the point and all attached edges.
You can also remove an edge only, it will be highligted as red on hover.
- DOWNLOAD DRAWN TEMPLATE AS AN .SVG - you can download setup configuration to use it in future
- UPLOAD A TEMPLATE FROM AN .SVG FILE - you can upload previously downloaded configuration

Let's draw an exampe skeleton - star. After the skeleton is drawn, you can setup each its point.
Just hover the point, do right mouse click and click `Configure`:

![](/images/image-skeleton-drawn-example.jpg)

Here you can setup a point name, its color and attributes if necessary like for a regular CVAT label:

![](/images/image-skeleton-point-setup.jpg)

Press `Done` button to finish editing the point. Press `Continue` button to save the skeleton.
Continue creating a task/project in a regular way.

For an existing task/project you are not allowed to change a skeleton configuration for now.
You can copy/insert skeletons configuration using `Raw` tab of the label configurator.

#### Drawing a skeleton from rectangle

In opened job go to left sidebar and find `Draw new skeleton` control, hover it:

![](/images/image-draw-new-skeleton.jpg)

If the control is absent, be sure you have setup at least one skeleton in the corresponding task/project.
In a pop-up dropdown you can select between a skeleton `Shape` and a skeleton `Track`, depends on your task.
Draw a skeleton as a regular bounding box, clicking two points on a canvas:

![](/images/image-draw-new-skeleton.gif)

Well done, you've just created the first skeleton.
