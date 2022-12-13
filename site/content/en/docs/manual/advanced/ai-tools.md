---
title: 'OpenCV and AI Tools'
linkTitle: 'OpenCV and AI Tools'
weight: 14
description: 'Overview of semi-automatic and automatic annotation tools available in CVAT.'
---

Label and annotate your data in semi-automatic and automatic mode with the help of **AI Tools** and **OpenCV**.

While [interpolation](/docs/manual/advanced/annotation-with-polygons/track-mode-with-polygons/)
is good for annotation of the videos made by the stable camera,
**AI Tools** and **OpenCV** are good for both:
videos where the camera is stable and videos, where it
moves together with the object, or movements of the object are chaotic.

See:

- [Interactors](#interactors)
  - [Annotate with interactors](#annotate-with-interactors)
  - [Deleting points](#deleting-points)
  - [Interactors Models](#interactors-models)
- [Detectors](#detectors)
  - [Annotate with detectors](#annotate-with-detectors)
  - [Detectors models](#detectors-models)
- [Trackers](#trackers)
- [OpenCV](#opencv)
  - [Intelligent scissors](#intelligent-scissors)
  - [Histogram Equalization](#histogram-equalization)
  - [TrackerMIL](#trackermil)
  - [Tracker models](#tracker-models)


## Interactors

Interactors are a part of **AI tools**.

Use interactors, to create a polygon semi-automatically.

Supported DL models are not bound to the label, you can use them to track any object.

When creating a polygon, you can use positive points
or negative points (for some models):

- **Positive points** are extreme points in the image,
  which are points that are either the leftmost, rightmost, topmost,
  or bottommost points in an object. By identifying these extreme points, the
  algorithm locate and segment objects in the image.
- **Negative points** are points placed outside of the object. By identifying
  negative points, the algiorithm can locate areas that do not belong
  to the object.

![](/images/image188_detrac.jpg)

### Annotate with interactors

To annotate with interactors, do the following:

1. Click **Magic wand** ![Magic wand](/images/image189.jpg), and go to the **Interactors** tab.
2. From the **Label** drop-down, select a label for the polygon.
3. From the **Interactor** drop-down, select a model (see [Interactors Models](#interactors-models)).
   <br>Click the **Question mark** to see information about each model:
   <br>![](/images/image114_detrac.jpg)
4. (Optional) If the model returns masks, and you need to
   convert masks to polygon, use the **Convert masks to polygons** toggle.
5. Click **Interact**.
6. Use the left click to add positive points and the right click to add negative points.
   <br>Number of points you can add depends on the model.
7. On the top menu, click **Done** (or **Shift+N**, **N**), and move to the next frame.

Each model has a minimal requred amount of points for annotation.
As soon as the required amount reached, the request is sent to the
server automatically. The server processes the request and adds a
polygon to the frame.

In case of the complex object, if you want to postpone the request
and finish adding extra the points first:

1. Hold down the **Ctrl** key.
   <br>On the top panel, the **Block** button will turn blue.
2. Add points to the image.
3. Release the **Ctrl** key, when ready.

In case you used **Mask to polygon** , when the object is finished,
you can edit it like a polygon.

You can change the number of points in the
polygon with slider:

![](/images/image224.jpg)

You can use the **Selected opacity** slider in
the [Objects sidebar](/docs/manual/basics/objects-sidebar/#appearance)
to change the opacity of the polygon.

For more information, see
[Annotation with polygons](/docs/manual/advanced/annotation-with-polygons/) section.

### Deleting points

If you are not satisfied with the result, you can set additional points or remove points.
<br>To remove a point, do the following:

1. With the cursor, hover over the point you want to delete.
2. If the point can be deleted, it will enlarge and the cursor will turn into a cross.
3. Left-click on the point.

### Interactors Models

<!--lint disable maximum-line-length-->

| Model                                                     | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Example                        |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------ | ----------------------------- |
| Deep extreme <br>cut (DEXTR)                              | This is an optimized version of the original model, <br>introduced at the end of 2017. It uses the <br>information about extreme points of an object <br>to get its mask. The mask is then converted to a polygon. <br>For now this is the fastest interactor on the CPU. <br>For more information, see: <li>[GitHub: DEXTR-PyTorch](https://github.com/scaelles/DEXTR-PyTorch) <li>[Site: DEXTR-PyTorch](https://cvlsegmentation.github.io/dextr)<li>[Paper: Deep Extreme Cut: DEXTR-PyTorch](https://arxiv.org/pdf/1711.09081.pdf)                                                                         | ![](/images/dextr_example.gif) |
| Feature backpropagating <br>refinement <br>scheme (f-BRS) | The model allows to get a mask for an <br>object using positive points (should be <br>left-clicked on the foreground), <br>and negative points (should be right-clicked <br>on the background, if necessary). <br>It is recommended to run the model on GPU, <br>if possible. <br>For more information, see: <li>[GitHub: f-BRS](https://github.com/saic-vul/fbrs_interactive_segmentation) <li>[Paper: Deep Extreme Cut: f-BRS](https://arxiv.org/pdf/2001.10331.pdf)                                                                                                                                       | ![](/images/dextr_example.gif) | ![](/images/fbrs_example.gif) |
| High Resolution <br>Net (HRNet)                           | The model allows to get a mask for <br>an object using positive points (should <br>be left-clicked on the foreground), <br> and negative points (should be <br>right-clicked on the background, <br> if necessary). <br>It is recommended to run the model on GPU, <br>if possible. <br>For more information, see: <li>[GitHub: HRNet](https://github.com/HRNet) <li>[Paper: HRNet](https://arxiv.org/pdf/1908.07919.pdf)                                                                                                                                                                                    | ![](/images/hrnet_example.gif) |
| Inside-Outside-Guidance<br>(IOG)                          | The model uses a bounding box and <br>inside/outside points to create a mask. <br>First of all, you need to create a bounding<br> box, wrapping the object. <br>Then you need to use positive <br>and negative points to say the <br>model where is <br>a foreground, and where is a background.<br>Negative points are optional. <br>For more information, see: <li>[GitHub: IOG](https://github.com/shiyinzhang/Inside-Outside-Guidance) <li>[Paper: HRNet](https://openaccess.thecvf.com/content_CVPR_2020/papers/Zhang_Interactive_Object_Segmentation_With_Inside-Outside_Guidance_CVPR_2020_paper.pdf) | ![](/images/iog_example.gif)   |

<!--lint enable maximum-line-length-->

## Detectors

Detectors are a part of **AI tools**.

Use detectors to automatically annotate one or more frames.

Each model is trained on a dataset. In many cases it is COCO, Pascal VOC.
The model supports labels that were available in the training dataset.
Need to clarify that the list of labels can be viewed on a model page
for each such model.

Supported DL models are suitable only for certain labels.

### Annotate with detectors

To annotate with detectors, do the following:

1. Click **Magic wand** ![Magic wand](/images/image189.jpg), and go to the **Detectors** tab.
2. From the **Model** drop-down, select model (see [Detectors Models](#detectors-models)).
3. From the left drop-down select the DL model label and match it to the right drop-down - the label of your task.

   ![](/images/image187.jpg)

4. (Optional) If the model returns masks, and you
   need to convert masks to polygon, use the **Convert masks to polygons** toggle.
5. Click **Annotate**.

Some of the models support attribute annotation like facial emotions,
for example **Attributed face detection** (`serverless/openvino/omz/intel/face-detection-0205`).

In this case, you can also match the attributes of the DL model with the attributes of a CVAT label.

![](/images/image187_1.jpg)

This action will automatically annotate one frame.
In the [Automatic annotation](/docs/manual/advanced/automatic-annotation/) section, you can read
how to make automatic annotations of all frames.

### Detectors models

<!--lint disable maximum-line-length-->

| Model       | Description                                                                                                                                               |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mask RCNN   | The model generates polygons for each instance of an object in the image.  <br> For more information, see: <li>[Github: Mask RCNN](https://github.com/matterport/Mask_RCNN)  <li>[Paper: Mask RCNN](https://arxiv.org/pdf/1703.06870.pdf)                                                                        |
| Faster RCNN | The model generates bounding boxes for each instance of an object in the image. <br>In this model, RPN and Fast R-CNN are combined into a single network. <br> For more information, see: <li>[Github: Faster RCNN](https://github.com/rbgirshick/py-faster-rcnn)  <li>[Paper: Faster RCNN](https://arxiv.org/pdf/1506.01497.pdf) |
| YOLO v3 | The model generates bounding boxes for each instance of an object in the image.  <br> For more information, see: <li>[Github: YOLO v3](https://github.com/ultralytics/yolov3) <li>[Site: YOLO v3](https://docs.ultralytics.com/#yolov3) <li>[Paper: YOLO v3](https://arxiv.org/pdf/1804.02767v1.pdf) |
| Semantic segmentation for ADAS| The model generates bounding boxes for each instance of an object in the image.  <br> For more information, see: <li>[Site: ADAS](https://docs.openvino.ai/2019_R1/_semantic_segmentation_adas_0001_description_semantic_segmentation_adas_0001.html)|
| Text detection 4 | Text detector based on PixelLink architecture with MobileNetV2, depth_multiplier=1.4 as a backbone for indoor/outdoor scenes. The model generates bounding boxes for each instance of an object in the image.  <br> For more information, see:  <li>[Site: Text detection v4](https://docs.openvino.ai/latest/omz_models_model_text_detection_0004.html)|


<!--lint enable maximum-line-length-->

## Trackers

Use trackers to automatically annotate an object with the bounding box.
<br>Supported DL models are not bound to the label, you can use them to track any object.

1. Click **Magic wand** ![Magic wand](/images/image189.jpg), and go to the **Trackers** tab.

   <br>![Start tracking an object](/images/trackers_tab.jpg)

2. From the **Label** drop-down, select the label for the object.
3. From **Tracker** drop-down, select tracker.
4. Click **Track**.
   <br>Then annotate the desired objects with the bounding box in the first frame:

   ![Annotation using a tracker](/images/tracker_ai_tools.gif)

5. For tracking, go to the top menu and click **Next** (or the **F** on the keyboard)
   to move on to the next frame.
   <br>All annotated objects will be automatically tracked when you move to the next frame.

When tracking:

- Enable/disable tracking using **Tracker switcher** on the objects sidebar.

  ![Tracker switcher](/images/tracker_switcher.jpg)

- Trackable objects have an indication on canvas with a model indication.

  ![Tracker indication](/images/tracker_indication_detrac.jpg)

- You can monitor the process by the messages appearing at the top.
  If you change one or more objects, before moving to the next frame, you will see a message, that
  the object states initialization is taking place.
  The objects that you do not change are already on the server
  and therefore do not require initialization. After the objects are initialized, tracking will occur.

  ![Tracker pop-up window](/images/tracker_pop-up_window.jpg)

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

3. Add the first point on the boundary of the allocated object. <br> You will see a line repeating the outline of the object.
4. Add the second point, so that the previous point is within the restrictive threshold.
   <br>After that a line repeating the object boundary will be automatically created between the points.
   ![](/images/image200_detrac.jpg)
5. To finish placing points, on the top menu**Done** (or **N** on the keyboard).

As a result, a polygon will be created
For more information, see [Annotation with polygons](/docs/manual/advanced/annotation-with-polygons/).

To increase or lower the action threshold, hold **Ctrl** and scroll the mouse wheel.
Increasing the action threshold will affect the performance.
During the drawing process, you can remove the last point by clicking on it with the left mouse button.

When tracking:

- You can create a boundary manually (like when
  [creating a polygon](/docs/manual/advanced/annotation-with-polygons/manual-drawing/))
  by temporarily disabling the automatic line creation. To do that, click `Ctrl`.

- You can change the number of points in the polygon with slider:

  ![](/images/image224.jpg)

- To change polygon opacity, on the [Objects sidebar](/docs/manual/basics/objects-sidebar/#appearance)
  use the **Selected opacity** slider.

### Histogram Equalization

Histogram equalization is a CV method that improves contrast in an
image to stretch out the intensity range.
This method usually increases the global contrast of images when its usable data
is represented by close contrast values.
It is useful in images with backgrounds and foregrounds that are both bright or dark.

1. In the **OpenCV** menu, go to the **Image** tab.
2. Click on **Histogram equalization** button.
   <br>![](/images/image221.jpg)

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

When tracking:

- You can enable/disable tracking using **Tracker switcher** on the sidebar.

  ![Tracker switcher](/images/tracker_switcher.jpg)

- Trackable objects have an indication on canvas with a model indication.

  ![Tracker indication](/images/tracker_indication_detrac.jpg)

- You can follow the tracking by the messages appearing at the top.

  ![Tracker pop-up window](/images/tracker_pop-up_window.jpg)

### Tracker models

<!--lint disable maximum-line-length-->

| Model                         | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| SiamMask                      | Fast online Object Tracking and Segmentation.<br>Tracker can track different objects in one server request. <br>Trackable object will be tracked automatically <br>if the previous frame was the latest keyframe for the object. <br>Has a tracker indication on canvas. <br>SiamMask tracker supported CUDA.                                                                                                                                                      |
| Transformer Tracking (TransT) | Simple and efficient online object tracking and segmentation tool. <br>Able to track different objects in one server request. <br>Trackable object will be tracked automatically if the previous<br> frame was the latest keyframe for the object. <br>Has tracker indication on canvas. <br>This is a modified version of the python framework PyTracking based on Pytorch. <br>For more information, see [TransT Github](https://github.com/chenxin-dlut/TransT) |

<!--lint enable maximum-line-length-->
