---
title: 'OpenCV and AI Tools'
linkTitle: 'OpenCV and AI Tools'
weight: 14
description: 'Overview of semi-automatic and automatic annotation tools available in CVAT.'
---


Label and annotate your data in semi-automatic and automatic mode with the help of **AI Tools** and **OpenCV**.

While [interpolation](/docs/manual/advanced/annotation-with-polygons/track-mode-with-polygons/)
is good for annotation of the videos made by the stable camera, **AI Tools** and **OpenCV** work
better for videos where the camera moves together with the object, or movements of the object are chaotic.



See:

- [AI Tools](#ai-tools)
  - [Interactors](#interactors)
  - [Interactors Models](#interactors-models)
  - [Detectors](#detectors)
  - [Detectors models](#detectors-models)
  - [Trackers](#trackers)
  - [Trackers models](#trackers-models)
- [OpenCV](#opencv)
  - [Intelligent scissors](#intelligent-scissors)
  - [Histogram Equalization](#histogram-equalization)
  - [TrackerMIL](#trackermil)


## AI Tools

**AI tools** are availible from the [controls sidebar](/docs/manual/basics/controls-sidebar/).
<br>Click ![Magic wand](/images/image189.jpg) to start annotate.

### Interactors

Use interactors, to create a polygon semi-automatically.

Supported DL models are not bound to the label, you can use them to track any object.

When creating a polygon, you can use positive (regular) points
or negative points (for some models):

- Positive points are the points related to the object.
- Negative points should be placed outside the boundary of the object.

![](/images/image188_detrac.jpg)

In most cases specifying positive points alone is enough to build a polygon.

**Adding points**

To annotate with interactors, do the following:

1. Click **Magic wand** ![Magic wand](/images/image189.jpg), and go to the **Ineractors** tab.
2. From the **Label** drop-down, select a label for the polygon.
3. From the **Ineractor** drop-down, select a model (see [Interactors Models](#interactors-models)).
   <br>Click the **Question mark** to see information about each model:
   <br>![](/images/image114_detrac.jpg)
4. If the model returns masks, and you need to convert masks to polygon, use the **Mask to polygon** toggle.
5. Click **Interact**.
6. Use the left click to add positive points and the right click to add negative points.
   <br>Number of points you can add depends on the model.
7. On the top menu, click **Done** (or **Shift+N**, **N**), and [move to the next frame](/docs/manual/basics/basic-navigation/).

When you place the points, the request is sent to the server immediately.
The server processes the request and adds a polygon to the frame.

If you want to postpone the request and finish adding all the points first:
1. Hold down the **Ctrl** key.
 <br>On the top panel, the **Block** button  will turn blue.
2. Add points to the image.
3. Release the **Ctrl** key, when ready.

When the object is finished, you can edit it like a polygon.

In the process of drawing, you can select the number of points in the polygon using the switch.

  ![](/images/image224.jpg)

For more information, see [Annotation with polygons](/docs/manual/advanced/annotation-with-polygons/) section.

You can use the **Selected opacity** slider in
the [Objects sidebar](/docs/manual/basics/objects-sidebar/#appearance)
to change the opacity of the polygon.


**Deleting points**

If you are not satisfied with the result, you can set additional points or remove points.
<br>To remove a point, do the following:

1. With the cursor, hover over the point you want to delete.
2. If the point can be deleted,  it will enlarge and the cursor will turn into a cross.
3. Left-click on the point.

### Interactors Models

<!--lint disable maximum-line-length-->

|Model|Description|Example|
|----|----|----|
|Deep extreme <br>cut (DEXTR)| This is an optimized version of the original model, <br>introduced at the end of 2017. It uses the <br>information about extreme points of an object <br>to get its mask. The mask is then converted to a polygon. <br>For now this is the fastest interactor on the CPU. |![](/images/dextr_example.gif)|
|Feature backpropagating <br>refinement <br>scheme (f-BRS)|The model allows to get a mask for an <br>object using positive points (should be <br>left-clicked on the foreground), <br>and negative points (should be right-clicked <br>on the background, if necessary). <br>It is recommended to run the model on GPU, <br>if possible.|![](/images/fbrs_example.gif)|
|High Resolution <br>Net (HRNet)|The model allows to get a mask for <br>an object using positive points (should <br>be left-clicked on the foreground), <br> and negative points(should be <br>right-clicked on the background, <br> if necessary). <br>It is recommended to run the model on GPU, <br>if possible.|![](/images/hrnet_example.gif)|
|Inside-Outside-Guidance<br>(IOG)|The model uses a bounding box and <br>inside/outside points to create a mask. <br>First of all, you need to create a bounding<br> box, wrapping the object. <br>Then you need to use positive <br>and negative points to say the <br>model where is <br>a foreground, and where is a background.<br>Negative points are optional.|![](/images/iog_example.gif)|

<!--lint enable maximum-line-length-->

### Detectors

Use detectors to automatically annotate one frame.
Supported DL models are suitable only for certain labels.

To annotate with detectors, do the following:

1. Click **Magic wand** ![Magic wand](/images/image189.jpg), and go to the **Detectors** tab.
2. From the **Model** drop-down, select model (see [Detectors Models](#detectors-models)).
3. From the left drop-down select the DL model label and match it to the right drop-down - the label of your task.
  ![](/images/image187.jpg)
4. Click **Annotate**.


Some of the models support attribute annotation (like facial emotions, for example: ``serverless/openvino/omz/intel/face-detection-0205``).
In this case, you can also match the attributes of the DL model with the attributes of a CVAT label.

 ![](/images/image187_1.jpg)

This action will automatically annotate one frame.
In the [Automatic annotation](/docs/manual/advanced/automatic-annotation/) section, you can read
how to make automatic annotations of all frames.

### Detectors models

<!--lint disable maximum-line-length-->

|Model|Description|
|----|----|
|Mask RCNN|The model generates polygons for each instance of an object in the image.|
|Faster RCNN|The model generates bounding boxes for each instance of an object in the image. <br>In this model, RPN and Fast R-CNN are combined into a single network.|

<!--lint enable maximum-line-length-->

### Trackers

Use trackers to automatically annotate an object with the bounding box.
<br>Supported DL models are not bound to the label, you can use them to track any object.

1. Click **Magic wand** ![Magic wand](/images/image189.jpg), and go to the **Trackers** tab.
   <br>![Start tracking an object](/images/trackers_tab.jpg)
2. From the **Label** drop-down, select the label for the object.
3. From **Tracker** drop-down, select tracker.
4. Click **Track**.

Then annotate the desired objects with the bounding box in the first frame:

  ![Annotation using a tracker](/images/tracker_ai_tools.gif)

All annotated objects will be automatically tracked when you move to the next frame.
<br>For tracking, go to the top menu, and click **Next** (or the **F** on the keyboard) to move on to the next frame.

You can enable/disable tracking using **Tracker switcher** on the objects sidebar.

  ![Tracker switcher](/images/tracker_switcher.jpg)

Trackable objects have an indication on canvas with a model indication.

  ![Tracker indication](/images/tracker_indication_detrac.jpg)

You can monitor the process by the messages appearing at the top.
If you change one or more objects, before moving to the next frame, you will see a message, that
the object states initialization is taking place.
The objects that you do not change are already on the server
and therefore do not require initialization. After the objects are initialized, tracking will occur.

  ![Tracker pop-up window](/images/tracker_pop-up_window.jpg)


### Trackers models

<!--lint disable maximum-line-length-->
|Model|Description|
|----|----|
|SiamMask|Fast online Object Tracking and Segmentation.<br>Tracker can track different objects in one server request. <br>Trackable object will be tracked automatically <br>if the previous frame was the latest keyframe for the object. <br>Has a tracker indication on canvas. <br>SiamMask tracker supported CUDA.|
|Transformer Tracking (TransT)|Simple and efficient online object tracking and segmentation tool. <br>Able to track different objects in one server request. <br>Trackable object will be tracked automatically if the previous<br> frame was the latest keyframe for the object. <br>Has tracker indication on canvas. <br>This is a modified version of the python framework PyTracking based on Pytorch. <br>For more information, see [TransT Github](https://github.com/chenxin-dlut/TransT)|

<!--lint enable maximum-line-length-->


> If you plan to track simple non-overlapping objects consider using fast client-side [TrackerMIL from OpenCV](#trackermil).


## OpenCV

The tool based on [Open CV](https://opencv.org/) Computer Vision library
which is an open-source product that includes many CV algorithms.
Some of these algorithms can be used to simplify the annotation process.

To start working with OpenCV, you need to load the OpenCV library first.
<br>To do this, on the [controls sidebar](/docs/manual/basics/controls-sidebar/),
click **OpenCV**![OpenCV](/images/image201.jpg)
<br>Library will be downloaded automatically.

![](/images/image198.jpg)

Once it is loaded, the tool's functionality will be available.

### Intelligent scissors

**Intelligent scissors** is a CV method of creating a polygon
by placing points with the automatic drawing of a line between them.
The distance between the adjacent points is limited by the threshold of action,
displayed as a red square that is tied to the cursor.

To use **Intelligent scissors**, do the following:

1. In the **OpenCV** menu, go to the **Drawing** tab.
2. Select the label, and then click on the **Intelligent scissors** button.

  ![](/images/image199.jpg)

2. Add the first point on the boundary of the allocated object. <br> You will see a line repeating the outline of the object.
3. Add the second point, so that the previous point is within the restrictive threshold.
  <br>After that a line repeating the object boundary will be automatically created between the points.

  ![](/images/image200_detrac.jpg)

To increase or lower the action threshold, hold **Ctrl** and scroll the mouse wheel.
Increasing the action threshold will affect the performance.
During the drawing process, you can remove the last point by clicking on it with the left mouse button.

- You can also create a boundary manually (like when
  [creating a polygon](/docs/manual/advanced/annotation-with-polygons/manual-drawing/)) by temporarily disabling
  the automatic line creation. To do that, switch blocking on by pressing `Ctrl`.

- In the process of drawing, you can select the number of points in the polygon using the switch.

  ![](/images/image224.jpg)

- You can use the `Selected opacity` slider in the `Objects sidebar` to change the opacity of the polygon.
  You can read more in the [Objects sidebar](/docs/manual/basics/objects-sidebar/#appearance) section.

- Once all the points are placed, you can complete the creation of the object
  by clicking on the `Done` button on the top panel or pressing `N` on your keyboard.
  As a result, a polygon will be created (read more about the polygons in the [annotation with polygons](/docs/manual/advanced/annotation-with-polygons/)).

### Histogram Equalization

Histogram equalization is a CV method that improves contrast in an image to stretch out the intensity range.
This method usually increases the global contrast of images when its usable data
is represented by close contrast values.
It is useful in images with backgrounds and foregrounds that are both bright or dark.

1. In the **OpenCV** menu, go to the **Image** tab.
2. Click on **Histogram equalization** button.

  ![](/images/image221.jpg)

Then contrast of the current frame will be improved.
If you change the frame, it will be equalized too.
 You can disable equalization by clicking the **Histogram equalization** button again.

  ![](/images/image222.jpg)

### TrackerMIL

Trackers are used to automatically annotate an object on video.
The TrackerMIL model is not bound to labels and can be used for any object.

For more information about how TrackerMIL works, see [Object Tracking using OpenCV (C++/Python)](https://learnopencv.com/tag/mil/)

1. In the **OpenCV** menu, go to the **Trackers** tab.
  <br>![Start tracking an object](/images/image242.jpg)
2. From the **Label** drop-down, select the label for the object.
3. From **Tracker** drop-down, select tracker.
4. Click **Track**.
5. To move to the next frame, on the top menu click the **Next** button (or **F** on the keyboard).


All annotated objects will be automatically tracked when you move to the next frame.

  ![Annotation using a tracker](/images/tracker_mil_detrac.gif)

You can enable/disable tracking using **Tracker switcher** on the sidebar.

  ![Tracker switcher](/images/tracker_switcher.jpg)

Trackable objects have an indication on canvas with a model indication.

  ![Tracker indication](/images/tracker_indication_detrac.jpg)

You can follow the tracking by the messages appearing at the top.

  ![Tracker pop-up window](/images/tracker_pop-up_window.jpg)
