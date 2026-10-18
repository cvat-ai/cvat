---
title: 'OpenCV tools'
linkTitle: 'OpenCV tools'
weight: 6
description: 'Use intelligent scissors, object tracking, and histogram equalization in CVAT.'
---

Open the **OpenCV** menu on the controls sidebar to draw polygons with intelligent scissors,
track objects across frames, or adjust image contrast.

- [Intelligent scissors](#intelligent-scissors)
- [Track objects](#track-objects)
- [Histogram equalization](#histogram-equalization)

## Intelligent scissors

To use **Intelligent scissors**, do the following:

1. On the menu toolbar, click **OpenCV**![OpenCV icon](/images/image201.jpg) and wait for the library to load.

   <br>![Interface for loading OpenCV progress bar](/images/image198.jpg)

2. Go to the **Drawing** tab, select the label, and click on the **Intelligent scissors** button.

   ![Selecting Intelligent scissors instrument in Drawing tab](/images/image199.jpg)

3. Add the first point on the boundary of the allocated object. <br> You will see a line repeating the outline of the object.
4. Add the second point, so that the previous point is within the restrictive threshold.
   <br>After that a line repeating the object boundary will be automatically created between the points.
   ![Diagram with points and lines created by intelligent scissors](/images/image200_detrac.jpg)
5. To finish placing points, on the top menu click **Done** (or **N** on the keyboard).

As a result, a polygon will be created.

You can change the number of points in the
polygon with the slider:

![Slider for point number in polygon](/images/image224.jpg)

To increase or lower the action threshold, hold **Ctrl** and scroll the mouse wheel.

During the drawing process, you can remove the last point by clicking on it with the left mouse button.

![Example of annotation process using Intelligent scissors](/images/intelligent_scissors.gif)

For more information on intelligent scissors, see the
[Intelligent Scissors Specification](https://docs.opencv.org/4.x/df/d6b/classcv_1_1segmentation_1_1IntelligentScissorsMB.html).

## Track objects

To track objects, do the following:

1. Create basic rectangle shapes or tracks for tracker initialization

2. On the menu toolbar, click **OpenCV**![OpenCV icon](/images/image201.jpg) and wait for the library to load.

   <br>![Interface for loading OpenCV progress bar](/images/image198.jpg)

3. From **Tracker** drop-down, select tracker and Click **Track**

   <br>![Tracking tab in OpenCV window with selected Tracker](/images/tracker_mil_control.png)

   Currently, TrackerMIL is the only tracker available.
   For more information on it,
   see [Object Tracking using OpenCV](https://learnopencv.com/tag/mil/).

4. Annotation actions window will pop-up. Setup `Target frame`
and `Convert rectangle shapes to tracks` parameters and click `Run`

   {{% alert title="Note" color="primary" %}}
   Tracking will be applied to all filtered rectangle annotations.
   {{% /alert %}}

   <br>![Annotation actions window with parameters and buttons](/images/tracker_mil_action.png)

All annotated objects will be automatically tracked up until target frame parameter.

## Histogram equalization

**Histogram equalization** improves
the contrast by stretching the intensity range.

It increases the global contrast of images
when its usable data is represented by close contrast values.

It is useful in images with backgrounds
and foregrounds that are bright or dark.

To improve the contrast of the image, do the following:

1. In the **OpenCV** menu, go to the **Image** tab.
2. Click on **Histogram equalization** button.
   <br>![Image tab in OpenCV window with highlighted histogram equalization button](/images/image221.jpg)

**Histogram equalization** will improve
contrast on current and following
frames.

Example of the result:

![Example of original image and image with applied histogram equalization](/images/image222.jpg)

To disable **Histogram equalization**, click on the button again.
