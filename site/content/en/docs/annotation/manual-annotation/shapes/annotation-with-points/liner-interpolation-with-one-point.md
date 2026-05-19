---
title: "Linear interpolation with one point"
linkTitle: "Linear interpolation with one point"
weight: 2
aliases:
- /docs/manual/advanced/annotation-with-points/liner-interpolation-with-one-point/
- /docs/annotation/tools/annotation-with-points/liner-interpolation-with-one-point/
---

You can use linear interpolation for points to annotate a moving object:

1. Before you start, select the `Points`.
1. Linear interpolation works only with one point, so you need to set `Number of points` to 1.
1. After that select the `Track`.

   ![Highlighted "Points" button with open "Draw new points" window](/images/image122.jpg)

1. Click `Track` to enter the drawing mode left-click to create a point
   and after that shape will be automatically completed.

   ![Example of annotation interface with created point](/images/image163_detrac.jpg)

1. Move forward a few frames and move the point to the desired position,
   this way you will create a keyframe and intermediate frames will be drawn automatically.
   You can work with this object as with an interpolated track: you can hide it using the `Outside`,
   move around keyframes, etc.

   ![Example of interpolated object created using keyframes](/images/image165_detrac.jpg)

1. This way you'll get linear interpolation using the `Points`.

   ![Example of annotation result made with linear interpolation](/images/gif013_detrac.gif)
