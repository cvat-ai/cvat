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
  - [AI tools: annotate with interactors](#ai-tools-annotate-with-interactors)
  - [AI tools: add extra points](#ai-tools-add-extra-points)
  - [AI tools: delete points](#ai-tools-delete-points)
  - [OpenCV: intelligent scissors](#opencv-intelligent-scissors)
  - [Interactors models](#interactors-models)
- [Detectors](#detectors)
  - [Labels matching](#labels-matching)
  - [Annotate with detectors](#annotate-with-detectors)
  - [Detectors models](#detectors-models)
- [Trackers](#trackers)
  - [AI tools: annotate with trackers](#ai-tools-annotate-with-trackers)
  - [OpenCV: annotate with trackers](#opencv-annotate-with-trackers)
  - [Trackers models](#trackers-models)
- [Additional settings](#additional-settings)
  - [OpenCV: histogram equalization](#opencv-histogram-equalization)
  - [General settings](#general-settings)
  - [When tracking](#when-tracking)

## Interactors

Interactors are a part of **AI tools** and **OpenCV**.

Use interactors to create a polygon semi-automatically.

Supported DL models are not bound to the label, you can use them to track any object.

When creating a polygon, you can use positive points
or negative points (for some models):

- **Positive points** are extreme points in the image,
  which are points that are either the leftmost, rightmost, topmost,
  or bottommost points in an object. By identifying these extreme points, the
  algorithm locates and segments objects in the image.
- **Negative points** are points placed outside of the object. By identifying
  negative points, the algorithm can locate areas that do not belong
  to the object.

![](/images/image188_detrac.jpg)

### AI tools: annotate with interactors

To annotate with interactors, do the following:

1. Click **Magic wand** ![Magic wand](/images/image189.jpg), and go to the **Interactors** tab.
2. From the **Label** drop-down, select a label for the polygon.
3. From the **Interactor** drop-down, select a model (see [Interactors Models](#interactors-models)).
   <br>Click the **Question mark** to see information about each model:
   <br>![](/images/image114_detrac.jpg)
4. (Optional) If the model returns masks, and you need to
   convert masks to polygons, use the **Convert masks to polygons** toggle.
5. Click **Interact**.
6. Use the left click to add positive points and the right click to add negative points.
   <br>Number of points you can add depends on the model.
7. On the top menu, click **Done** (or **Shift+N**, **N**), and move to the next frame.

### AI tools: add extra points

Each model has a minimum required amount of points for annotation.
As soon as the required amount is reached, the request is sent to the
server automatically. The server processes the request and adds a
polygon to the frame.

In the case of the complex object, if you want to postpone the request
and finish adding extra points first:

1. Hold down the **Ctrl** key.
   <br>On the top panel, the **Block** button will turn blue.
2. Add points to the image.
3. Release the **Ctrl** key, when ready.

In case you used **Mask to polygon** when the object is finished,
you can edit it like a polygon.

You can change the number of points in the
a polygon with the slider:

![](/images/image224.jpg)

### AI tools: delete points

<br>To remove a point, do the following:

1. With the cursor, hover over the point you want to delete.
2. If the point can be deleted, it will enlarge and the cursor will turn into a cross.
3. Left-click on the point.

### OpenCV: intelligent scissors

To use **Intelligent scissors**, do the following:

1. On the menu toolbar, click **OpenCV**![OpenCV](/images/image201.jpg) and wait for the library to load.

   <br>![](/images/image198.jpg)

2. Go to the **Drawing** tab, select the label, and click on the **Intelligent scissors** button.

   ![](/images/image199.jpg)

3. Add the first point on the boundary of the allocated object. <br> You will see a line repeating the outline of the object.
4. Add the second point, so that the previous point is within the restrictive threshold.
   <br>After that a line repeating the object boundary will be automatically created between the points.
   ![](/images/image200_detrac.jpg)
5. To finish placing points, on the top menu **Done** (or **N** on the keyboard).

As a result, a polygon will be created.

You can change the number of points in the
a polygon with the slider:

![](/images/image224.jpg)

To increase or lower the action threshold, hold **Ctrl** and scroll the mouse wheel.

> **Note:** Increasing the action threshold will affect the performance.

During the drawing process, you can remove the last point by clicking on it with the left mouse button.

### Interactors models

<!--lint disable maximum-line-length-->

| Model                                                     | Tool    | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Example                                                          |
| --------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Deep extreme <br>cut (DEXTR)                              | AI Tool | This is an optimized version of the original model, <br>introduced at the end of 2017. It uses the <br>information about extreme points of an object <br>to get its mask. The mask is then converted to a polygon. <br>For now this is the fastest interactor on the CPU. <br><br>For more information, see: <li>[GitHub: DEXTR-PyTorch](https://github.com/scaelles/DEXTR-PyTorch) <li>[Site: DEXTR-PyTorch](https://cvlsegmentation.github.io/dextr)<li>[Paper: Deep Extreme Cut: DEXTR-PyTorch](https://arxiv.org/pdf/1711.09081.pdf)                                                                       | ![](/images/dextr_example.gif)                                   |
| Feature backpropagating <br>refinement <br>scheme (f-BRS) | AI Tool | The model allows to get a mask for an <br>object using positive points (should be <br>left-clicked on the foreground), <br>and negative points (should be right-clicked <br>on the background, if necessary). <br>It is recommended to run the model on GPU, <br>if possible. <br><br>For more information, see: <li>[GitHub: f-BRS](https://github.com/saic-vul/fbrs_interactive_segmentation) <li>[Paper: Deep Extreme Cut: f-BRS](https://arxiv.org/pdf/2001.10331.pdf)                                                                                                                                     | ![](/images/fbrs_example.gif)                                    |
| High Resolution <br>Net (HRNet)                           | AI Tool | The model allows to get a mask for <br>an object using positive points (should <br>be left-clicked on the foreground), <br> and negative points (should be <br>right-clicked on the background, <br> if necessary). <br>It is recommended to run the model on GPU, <br>if possible. <br><br>For more information, see: <li>[GitHub: HRNet](https://github.com/HRNet) <li>[Paper: HRNet](https://arxiv.org/pdf/1908.07919.pdf)                                                                                                                                                                                  | ![](/images/hrnet_example.gif)                                   |
| Inside-Outside-Guidance<br>(IOG)                          | AI Tool | The model uses a bounding box and <br>inside/outside points to create a mask. <br>First of all, you need to create a bounding<br> box, wrapping the object. <br>Then you need to use positive <br>and negative points to say the <br>model where is <br>a foreground, and where is a background.<br>Negative points are optional. <br><br>For more information, see: <li>[GitHub: IOG](https://github.com/shiyinzhang/Inside-Outside-Guidance) <li>[Paper: IOG](https://openaccess.thecvf.com/content_CVPR_2020/papers/Zhang_Interactive_Object_Segmentation_With_Inside-Outside_Guidance_CVPR_2020_paper.pdf) | ![](/images/iog_example.gif)                                     |
| Intelligent scissors                                      | OpenCV  | Intelligent scissors is a CV method of creating <br>a polygon by placing points with the automatic <br>drawing of a line between them. The distance<br> between the adjacent points is limited by <br>the threshold of action, displayed as a <br>red square that is tied to the cursor. <br><br> For more information, see: <li>[Site: Intelligent Scissors Specification](https://docs.opencv.org/4.x/df/d6b/classcv_1_1segmentation_1_1IntelligentScissorsMB.html)                                                                                                                                          | See [OpenCV: intelligent scissors](#opencv-intelligent-scissors) |

<!--lint enable maximum-line-length-->

## Detectors

Detectors are a part of **AI tools**.

Use detectors to automatically annotate one or more frames.

### Labels matching

Each model is trained on a dataset and supports only the dataset's labels.

For example:

- DL model has the label `car`.
- Your task (or project) has the label `vehicle`.

To annotate, you need to match these two labels to give
DL model a hint, that in this case `car` = `vehicle`.

If you have a label that is not on the list
of DL labels, you will not be available to
match them.

For this reason, supported DL models are suitable only for certain labels.
<br>To check list of labels for each model, see [Detectors models](#detectors-models).

### Annotate with detectors

To annotate with detectors, do the following:

1. Click **Magic wand** ![Magic wand](/images/image189.jpg), and go to the **Detectors** tab.
2. From the **Model** drop-down, select model (see [Detectors Models](#detectors-models)).
3. From the left drop-down select the DL model label and match it to the right drop-down - the label of your task.

   ![](/images/image187.jpg)

4. (Optional) If the model returns masks, and you
   need to convert masks to polygons, use the **Convert masks to polygons** toggle.
5. Click **Annotate**.

This action will automatically annotate one frame.
For automatic annotation of multiple frames,
see [Automatic annotation](/docs/manual/advanced/automatic-annotation/).

### Detectors models

<!--lint disable maximum-line-length-->

| Model                          | Description                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mask RCNN                      | The model generates polygons for each instance of an object in the image. <br><br> For more information, see: <li>[Github: Mask RCNN](https://github.com/matterport/Mask_RCNN) <li>[Paper: Mask RCNN](https://arxiv.org/pdf/1703.06870.pdf)                                                                                                                                  |
| Faster RCNN                    | The model generates bounding boxes for each instance of an object in the image. <br>In this model, RPN and Fast R-CNN are combined into a single network. <br><br> For more information, see: <li>[Github: Faster RCNN](https://github.com/rbgirshick/py-faster-rcnn) <li>[Paper: Faster RCNN](https://arxiv.org/pdf/1506.01497.pdf)                                         |
| YOLO v3                        | YOLO v3 is a family of object detection architectures and models pre-trained on the COCO dataset. <br><br> For more information, see: <li>[Github: YOLO v3](https://github.com/ultralytics/yolov3) <li>[Site: YOLO v3](https://docs.ultralytics.com/#yolov3) <li>[Paper: YOLO v3](https://arxiv.org/pdf/1804.02767v1.pdf)                                                    |
| YOLO v5                        | YOLO v5 is a family of object detection architectures and models based on the Pytorch framework. <br><br> For more information, see: <li>[Github: YOLO v5](https://github.com/ultralytics/yolov5) <li>[Site: YOLO v5](https://docs.ultralytics.com/#yolov5) <li>[Paper: YOLO v5](https://pjreddie.com/darknet/yolo/)                                                         |
| Semantic segmentation for ADAS | This is a segmentation network to classify each pixel into 20 classes. <br><br> For more information, see: <li>[Site: ADAS](https://docs.openvino.ai/2019_R1/_semantic_segmentation_adas_0001_description_semantic_segmentation_adas_0001.html)                                                                                                                              |
| Mask RCNN with Tensorflow      | Mask RCNN version with Tensorflow. The model generates polygons for each instance of an object in the image. <br><br> For more information, see: <li>[Github: Mask RCNN](https://github.com/matterport/Mask_RCNN) <li>[Paper: Mask RCNN](https://arxiv.org/pdf/1703.06870.pdf)                                                                                               |
| Faster RCNN with Tensorflow    | Faster RCNN version with Tensorflow. The model generates bounding boxes for each instance of an object in the image. <br>In this model, RPN and Fast R-CNN are combined into a single network. <br><br> For more information, see: <li>[Github: Faster RCNN](https://github.com/rbgirshick/py-faster-rcnn) <li>[Paper: Faster RCNN](https://arxiv.org/pdf/1506.01497.pdf)    |
| RetinaNet                      | Pytorch implementation of RetinaNet object detection. <br> <br><br> For more information, see: <li>[Github: RetinaNet](https://github.com/yhenon/pytorch-retinanet) <li>[Paper: Faster RCNN](https://arxiv.org/pdf/1708.02002.pdf)                                                                                                                                           |
| Face Detection                 | Face detector based on MobileNetV2 as a backbone for indoor and outdoor scenes shot by a front-facing camera. <br> <br><br> For more information, see: <li>[Site: Face Detection 0205](https://docs.openvino.ai/latest/omz_models_model_face_detection_0205.html) <li>[Site: Face Detection 0206](https://docs.openvino.ai/latest/omz_models_model_face_detection_0206.html) |

<!--lint enable maximum-line-length-->

## Trackers

Trackers are part of **AI Tools** and **OpenCV**

Use trackers to automatically annotate an object with the bounding box.
<br>Supported DL models are not bound to the label, you can use them to track any object.

### AI tools: annotate with trackers

To annotate with trackers, do the following:

1. Click **Magic wand** ![Magic wand](/images/image189.jpg), and go to the **Trackers** tab.

   <br>![Start tracking an object](/images/trackers_tab.jpg)

2. From the **Label** drop-down, select the label for the object.
3. From **Tracker** drop-down, select tracker.
4. Click **Track**.
   <br>Then annotate the desired objects with the bounding box in the first frame:

5. For tracking, go to the top menu and click **Next** (or the **F** on the keyboard)
   to move on to the next frame.
   <br>All annotated objects will be automatically tracked when you move to the next frame.

### OpenCV: annotate with trackers

To annotate with trackers, do the following:

1. On the menu toolbar, click **OpenCV**![OpenCV](/images/image201.jpg) and wait for the library to load.

   <br>![](/images/image198.jpg)

2. Go to the **Tracker** tab, select the label, and click **Tracking**.

   <br>![Start tracking an object](/images/image242.jpg)

3. From the **Label** drop-down, select the label for the object.
4. From **Tracker** drop-down, select tracker.
5. Click **Track**.
6. To move to the next frame, on the top menu click the **Next** button (or **F** on the keyboard).

All annotated objects will be automatically tracked when you move to the next frame.

### Trackers models

<!--lint disable maximum-line-length-->

| Model  | Tool     | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Example                                                       |
| ----------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| TrackerMIL | OpenCV| TrackerMIL model is not bound to <br>labels and can be used for any <br>object. It is a fast client-side model <br>designed to track simple non-overlapping objects. <br><br>For more information, see: <li>[Article: Object Tracking using OpenCV](https://learnopencv.com/tag/mil/)| ![Annotation using a tracker](/images/tracker_mil_detrac.gif)|
| SiamMask                      | AI Tools | Fast online Object Tracking and Segmentation.<br>Tracker can track different objects in one <br>server request. The trackable object will <br>be tracked automatically if the previous frame <br>was the latest keyframe for the object. <br>Has a tracker indication on canvas. <br>SiamMask tracker supported CUDA. <br><br>For more information, see:<li> [Github: SiamMask](https://github.com/foolwood/SiamMask) <li> [Paper: SiamMask](https://arxiv.org/pdf/1812.05050.pdf)                                                                   | ![Annotation using a tracker](/images/tracker_ai_tools.gif)   |
| Transformer Tracking (TransT) | AI Tools | Simple and efficient online object tracking <br>and segmentation tool. Able to track <br>different objects in one server request. <br>Trackable object will be tracked automatically <br>if the previous frame was the latest<br>keyframe for the object. <br>Has tracker indication on canvas. <br>This is a modified version of the python framework<br> PyTracking based on Pytorch. <br><br>For more information, see: <li> [Github: TransT](https://github.com/chenxin-dlut/TransT)<li> [Paper: TransT](https://arxiv.org/pdf/2103.15436.pdf) | See SiamMask example.                                         |

<!--lint enable maximum-line-length-->

## Additional settings

### OpenCV: histogram equalization

Histogram equalization is an **Open CV** method that improves
the contrast in an image to stretch out the intensity range.
**Histogram equalization** increases the global contrast of images
when its usable data is represented by close contrast values.

It is useful in images with backgrounds
and foregrounds that are both bright or dark.

To improve the contrast of the image, do the following:

1. In the **OpenCV** menu, go to the **Image** tab.
2. Click on **Histogram equalization** button.
   <br>![](/images/image221.jpg)

**Histogram equalization** will improve
contrast on current and following
frames.

Example of the result:

![](/images/image222.jpg)

To disable **Histogram equalization**, click on the button again.

### General settings

- On how to adjust the polygon,
  see [Objects sidebar](/docs/manual/basics/objects-sidebar/#appearance)

- For more information about polygons in general, see
  [Annotation with polygons](/docs/manual/advanced/annotation-with-polygons/).

### When tracking

- You can enable/disable tracking using **Tracker switcher** on the sidebar.

  ![Tracker switcher](/images/tracker_switcher.jpg)

- Trackable objects have an indication on canvas with a model indication.

  ![Tracker indication](/images/tracker_indication_detrac.jpg)

- You can follow the tracking by the messages appearing at the top.

  ![Tracker pop-up window](/images/tracker_pop-up_window.jpg)
