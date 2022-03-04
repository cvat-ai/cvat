---
title: 'AI Tools'
linkTitle: 'AI Tools'
weight: 14
description: 'Overview of semi-automatic and automatic annotation tools available in CVAT.'
---

The tool is designed for semi-automatic and automatic annotation using DL models.
The tool is available only if there is a corresponding model.
For more details about DL models read the [Models](/docs/manual/advanced/models/) section.

## Interactors

Interactors are used to create a polygon semi-automatically.
Supported DL models are not bound to the label and can be used for any objects.
To create a polygon usually you need to use regular or positive points.
For some kinds of segmentation negative points are available.
Positive points are the points related to the object.
Negative points should be placed outside the boundary of the object.
In most cases specifying positive points alone is enough to build a polygon.
A list of available out-of-the-box interactors is placed below.

- Before you start, select the `magic wand` on the controls sidebar and go to the `Interactors` tab.
  Then select a label for the polygon and a required DL model. To view help about each of the
  models, you can click the `Question mark` icon.

  ![](/images/image114_detrac.jpg)

- Click `Interact` to enter the interaction mode. Depending on the selected model,
  the method of markup will also differ.
  Now you can place positive and/or negative points. The [IOG](#inside-outside-guidance) model also uses a rectangle.
  Left click creates a positive point and right click creates a negative point.
  After placing the required number of points (the number is different depending on the model),
  the request will be sent to the server and when the process is complete a polygon will be created.
  If you are not satisfied with the result, you can set additional points or remove points.
  To delete a point, hover over the point you want to delete, if the point can be deleted,
  it will enlarge and the cursor will turn into a cross, then left-click on the point.
  If you want to postpone the request and create a few more points, hold down `Ctrl` and continue (the `Block`
  button on the top panel will turn blue), the request will be sent after the key is released.

  ![](/images/image188_detrac.jpg)

- In the process of drawing, you can select the number of points in the polygon using the switch.

  ![](/images/image224.jpg)

- You can use the `Selected opacity` slider in the `Objects sidebar` to change the opacity of the polygon.
  You can read more in the [Objects sidebar](/docs/manual/basics/objects-sidebar/#appearance) section.

- To finish interaction, click on the `Done` button on the top panel or press `N` on your keyboard.

- When the object is finished, you can edit it like a polygon.
  You can read about editing polygons in the [Annotation with polygons](/docs/manual/advanced/annotation-with-polygons/) section.

### Deep extreme cut (DEXTR)

This is an optimized version of the original model, introduced at the end of 2017.
It uses the information about extreme points of an object to get its mask. The mask then converted to a polygon.
For now this is the fastest interactor on CPU.

![](/images/dextr_example.gif)

### Feature backpropagating refinement scheme (f-BRS)

The model allows to get a mask for an object using positive points
(should be left-clicked on the foreground), and negative points
(should be right-clicked on the background, if necessary).
It is recommended to run the model on GPU, if possible.

![](/images/fbrs_example.gif)

### High Resolution Net (HRNet)

The model allows to get a mask for an object using positive points
(should be left-clicked on the foreground), and negative points
(should be right-clicked on the background, if necessary).
It is recommended to run the model on GPU, if possible.

![](/images/hrnet_example.gif)

### Inside-Outside-Guidance

The model uses a bounding box and inside/outside points to create a mask.
First of all, you need to create a bounding box, wrapping the object.
Then you need to use positive and negative points to say the model where is a foreground,
and where is a background. Negative points are optional.

![](/images/iog_example.gif)

## Detectors

Detectors are used to automatically annotate one frame. Supported DL models are suitable only for certain labels.

- Before you start, click the `magic wand` on the controls sidebar and select the `Detectors` tab.
  You need to match the labels of the DL model (left column) with the labels in your task (right column).
  Then click `Annotate`.

  ![](/images/image187.jpg)

- This action will automatically annotates one frame.
  In the [Automatic annotation](/docs/manual/advanced/automatic-annotation/) section you can read
  how to make automatic annotation of all frames.

### Mask RCNN

The model generates polygons for each instance of an object in the image.

### Faster RCNN

The model generates bounding boxes for each instance of an object in the image. In this model,
RPN and Fast R-CNN are combined into a single network.

## Trackers

Trackers are used to automatically annotate an object using bounding box.
Supported DL models are not bound to the label and can be used for any objects.

- Before you start, select the `magic wand` on the controls sidebar and go to the `Trackers` tab.
  Then select a `Label` and `Tracker` for the object and click `Track`. Then annotate the desired objects with the
  bounding box in the first frame.

  ![Start tracking an object](/images/trackers_tab.jpg)

- All annotated objects will be automatically tracked when you move to the next frame.
  For tracking, use `Next` button on the top panel or the `F` button to move on to the next frame.

  ![Annotation using a tracker](/images/tracker_mil_detrac.gif)

- You can enable/disable tracking using `tracker switcher` on sidebar.

  ![Tracker switcher](/images/tracker_switcher.jpg)

- Trackable objects have indication on canvas with a model indication.

  ![Tracker indication](/images/tracker_indication_detrac.jpg)

- You can monitoring the process by the messages appearing at the top.
  If you change one or more objects, before moving to the next frame, you will see a message that
  the objects states initialization is taking place. The objects that you do not change are already on the server
  and therefore do not require initialization. After the objects are initialized, tracking will occur.

  ![Tracker pop-up window](/images/tracker_pop-up_window.jpg)

### SiamMask

Fast online Object Tracking and Segmentation. Tracker is able to track different objects in one server request.
Trackable object will be tracked automatically if the previous frame was
a latest keyframe for the object. Have tracker indication on canvas. `SiamMask` tracker supported CUDA.

> If you plan to track simple non-overlapping objects consider using fast client-side [TrackerMIL from OpenCV](/docs/manual/advanced/opencv-tools/#trackermil).
