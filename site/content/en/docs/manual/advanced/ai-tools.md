---
title: 'OpenCV and AI Tools'
linkTitle: 'OpenCV and AI Tools'
weight: 14
description: 'Overview of semi-automatic and automatic annotation tools available in CVAT.'
---

Label and annotate your data in semi-automatic and automatic mode with the help of **AI** and **OpenCV** tools.

While {{< ilink "/docs/manual/advanced/annotation-with-polygons/track-mode-with-polygons" "interpolation" >}}
is good for annotation of the videos made by the security cameras,
**AI** and **OpenCV** tools are good for both:
videos where the camera is stable and videos, where it
moves together with the object, or movements of the object are chaotic.

See:

- [Interactors](#interactors)
  - [AI tools: annotate with interactors](#ai-tools-annotate-with-interactors)
  - [AI tools: add extra points](#ai-tools-add-extra-points)
  - [AI tools: delete points](#ai-tools-delete-points)
  - [OpenCV: intelligent scissors](#opencv-intelligent-scissors)
  - [Settings](#settings)
  - [Interactors models](#interactors-models)
- [Detectors](#detectors)
  - [Labels matching](#labels-matching)
  - [Annotate with detectors](#annotate-with-detectors)
  - [Detectors models](#detectors-models)
- [Trackers](#trackers)
  - [AI tools: annotate with trackers](#ai-tools-annotate-with-trackers)
  - [OpenCV: annotate with trackers](#opencv-annotate-with-trackers)
  - [When tracking](#when-tracking)
  - [Trackers models](#trackers-models)
- [OpenCV: histogram equalization](#opencv-histogram-equalization)

## Interactors

Interactors are a part of **AI** and **OpenCV** tools.

Use interactors to label objects in images by
creating a polygon semi-automatically.

When creating a polygon, you can use positive points
or negative points (for some models):

- **Positive points** define the area in which the object is located.
- **Negative points** define the area in which the object is not located.

![](/images/image188_detrac.jpg)

### AI tools: annotate with interactors

To annotate with interactors, do the following:

1. Click **Magic wand** ![Magic wand](/images/image189.jpg), and go to the **Interactors** tab.
2. From the **Label** drop-down, select a label for the polygon.
3. From the **Interactor** drop-down, select a model (see [Interactors models](#interactors-models)).
   <br>Click the **Question mark** to see information about each model:
   <br>![](/images/image114_detrac.jpg)
4. (Optional) If the model returns masks, and you need to
   convert masks to polygons, use the **Convert masks to polygons** toggle.
5. Click **Interact**.
6. Use the left click to add positive points and the right click to add negative points.
   <br>Number of points you can add depends on the model.
7. On the top menu, click **Done** (or **Shift+N**, **N**).

### AI tools: add extra points

> **Note:** More points improve outline accuracy, but make shape editing harder.
> Fewer points make shape editing easier, but reduce outline accuracy.

Each model has a minimum required number of points for annotation.
Once the required number of points is reached, the request
is automatically sent to the server.
The server processes the request and adds a polygon to the frame.

For a more accurate outline, postpone request
to finish adding extra points first:

1. Hold down the **Ctrl** key.
   <br>On the top panel, the **Block** button will turn blue.
2. Add points to the image.
3. Release the **Ctrl** key, when ready.

In case you used **Mask to polygon** when the object is finished,
you can edit it like a polygon.

You can change the number of points in the
polygon with the slider:

![](/images/image224.jpg)

### AI tools: delete points

<br>To delete a point, do the following:

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
5. To finish placing points, on the top menu click **Done** (or **N** on the keyboard).

As a result, a polygon will be created.

You can change the number of points in the
polygon with the slider:

![](/images/image224.jpg)

To increase or lower the action threshold, hold **Ctrl** and scroll the mouse wheel.

During the drawing process, you can remove the last point by clicking on it with the left mouse button.

### Settings

- On how to adjust the polygon,
  see [Objects sidebar](/docs/manual/basics/CVAT-annotation-Interface/objects-sidebar#appearance).

- For more information about polygons in general, see
  {{< ilink "/docs/manual/advanced/annotation-with-polygons" "Annotation with polygons" >}}.

### Interactors models

<!--lint disable maximum-line-length-->

| Model                                                     | Tool     | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Example                                           |
| --------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Segment Anything Model (SAM)                              | AI Tools | The Segment Anything Model (SAM) produces high <br> quality object masks, and it can be used to generate <br> masks for all objects in an image. It has been trained <br>on a dataset of 11 million images and <br>1.1 billion masks, and has strong zero-shot performance on a variety of segmentation tasks. <br><br>For more information, see: <li>[GitHub: Segment Anything](https://github.com/facebookresearch/segment-anything) <li>[Site: Segment Anything](https://segment-anything.com/)<li>[Paper: Segment Anything](https://ai.facebook.com/research/publications/segment-anything/)               | ![](/images/interactors_SAM.gif)                  |
| Deep extreme <br>cut (DEXTR)                              | AI Tool  | This is an optimized version of the original model, <br>introduced at the end of 2017. It uses the <br>information about extreme points of an object <br>to get its mask. The mask is then converted to a polygon. <br>For now this is the fastest interactor on the CPU. <br><br>For more information, see: <li>[GitHub: DEXTR-PyTorch](https://github.com/scaelles/DEXTR-PyTorch) <li>[Site: DEXTR-PyTorch](https://cvlsegmentation.github.io/dextr)<li>[Paper: DEXTR-PyTorch](https://arxiv.org/pdf/1711.09081.pdf)                                                                                         | ![](/images/dextr_example.gif)                    |
| Feature backpropagating <br>refinement <br>scheme (f-BRS) | AI Tool  | The model allows to get a mask for an <br>object using positive points (should be <br>left-clicked on the foreground), <br>and negative points (should be right-clicked <br>on the background, if necessary). <br>It is recommended to run the model on GPU, <br>if possible. <br><br>For more information, see: <li>[GitHub: f-BRS](https://github.com/saic-vul/fbrs_interactive_segmentation) <li>[Paper: f-BRS](https://arxiv.org/pdf/2001.10331.pdf)                                                                                                                                                       | ![](/images/fbrs_example.gif)                     |
| High Resolution <br>Net (HRNet)                           | AI Tool  | The model allows to get a mask for <br>an object using positive points (should <br>be left-clicked on the foreground), <br> and negative points (should be <br>right-clicked on the background, <br> if necessary). <br>It is recommended to run the model on GPU, <br>if possible. <br><br>For more information, see: <li>[GitHub: HRNet](https://github.com/saic-vul/ritm_interactive_segmentation) <li>[Paper: HRNet](https://arxiv.org/pdf/2102.06583.pdf)                                                                                                                                                 | ![](/images/hrnet_example.gif)                    |
| Inside-Outside-Guidance<br>(IOG)                          | AI Tool  | The model uses a bounding box and <br>inside/outside points to create a mask. <br>First of all, you need to create a bounding<br> box, wrapping the object. <br>Then you need to use positive <br>and negative points to say the <br>model where is <br>a foreground, and where is a background.<br>Negative points are optional. <br><br>For more information, see: <li>[GitHub: IOG](https://github.com/shiyinzhang/Inside-Outside-Guidance) <li>[Paper: IOG](https://openaccess.thecvf.com/content_CVPR_2020/papers/Zhang_Interactive_Object_Segmentation_With_Inside-Outside_Guidance_CVPR_2020_paper.pdf) | ![](/images/iog_example.gif)                      |
| Intelligent scissors                                      | OpenCV   | Intelligent scissors is a CV method of creating <br>a polygon by placing points with the automatic <br>drawing of a line between them. The distance<br> between the adjacent points is limited by <br>the threshold of action, displayed as a <br>red square that is tied to the cursor. <br><br> For more information, see: <li>[Site: Intelligent Scissors Specification](https://docs.opencv.org/4.x/df/d6b/classcv_1_1segmentation_1_1IntelligentScissorsMB.html)                                                                                                                                          | ![int scissors](/images/intelligent_scissors.gif) |

<!--lint enable maximum-line-length-->

## Detectors

Detectors are a part of **AI** tools.

Use detectors to automatically
identify and locate objects in images or videos.

### Labels matching

Each model is trained on a dataset and supports only the dataset's labels.

For example:

- DL model has the label `car`.
- Your task (or project) has the label `vehicle`.

To annotate, you need to match these two labels to give
DL model a hint, that in this case `car` = `vehicle`.

If you have a label that is not on the list
of DL labels, you will not be able to
match them.

For this reason, supported DL models are suitable only for certain labels.
<br>To check the list of labels for each model, see [Detectors models](#detectors-models).

### Annotate with detectors

To annotate with detectors, do the following:

1. Click **Magic wand** ![Magic wand](/images/image189.jpg), and go to the **Detectors** tab.
2. From the **Model** drop-down, select model (see [Detectors models](#detectors-models)).
3. From the left drop-down select the DL model label, from the right drop-down
   select the matching label of your task.

   ![](/images/image187.jpg)

4. (Optional) If the model returns masks, and you
   need to convert masks to polygons, use the **Convert masks to polygons** toggle.
5. Click **Annotate**.

This action will automatically annotate one frame.
For automatic annotation of multiple frames,
see {{< ilink "/docs/manual/advanced/automatic-annotation" "Automatic annotation" >}}.

### Detectors models

<!--lint disable maximum-line-length-->

| Model                          | Description                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Mask RCNN                      | The model generates polygons for each instance of an object in the image. <br><br> For more information, see: <li>[GitHub: Mask RCNN](https://github.com/matterport/Mask_RCNN) <li>[Paper: Mask RCNN](https://arxiv.org/pdf/1703.06870.pdf)                                                                                                                                                                                    |
| Faster RCNN                    | The model generates bounding boxes for each instance of an object in the image. <br>In this model, RPN and Fast R-CNN are combined into a single network. <br><br> For more information, see: <li>[GitHub: Faster RCNN](https://github.com/ShaoqingRen/faster_rcnn) <li>[Paper: Faster RCNN](https://arxiv.org/pdf/1506.01497.pdf)                                                                                             |
| YOLO v3                        | YOLO v3 is a family of object detection architectures and models pre-trained on the COCO dataset. <br><br> For more information, see: <li>[GitHub: YOLO v3](https://github.com/ultralytics/yolov3) <li>[Site: YOLO v3](https://docs.ultralytics.com/#yolov3) <li>[Paper: YOLO v3](https://arxiv.org/pdf/1804.02767v1.pdf)                                                                                                      |
| Semantic segmentation for ADAS | This is a segmentation network to classify each pixel into 20 classes. <br><br> For more information, see: <li>[Site: ADAS](https://docs.openvino.ai/2019_R1/_semantic_segmentation_adas_0001_description_semantic_segmentation_adas_0001.html)                                                                                                                                                                                |
| Mask RCNN with Tensorflow      | Mask RCNN version with Tensorflow. The model generates polygons for each instance of an object in the image. <br><br> For more information, see: <li>[GitHub: Mask RCNN](https://github.com/matterport/Mask_RCNN) <li>[Paper: Mask RCNN](https://arxiv.org/pdf/1703.06870.pdf)                                                                                                                                                 |
| Faster RCNN with Tensorflow    | Faster RCNN version with Tensorflow. The model generates bounding boxes for each instance of an object in the image. <br>In this model, RPN and Fast R-CNN are combined into a single network. <br><br> For more information, see: <li>[Site: Faster RCNN with Tensorflow](https://docs.openvino.ai/2021.4/omz_models_model_faster_rcnn_inception_v2_coco.html) <li>[Paper: Faster RCNN](https://arxiv.org/pdf/1506.01497.pdf) |
| RetinaNet                      | Pytorch implementation of RetinaNet object detection. <br> <br><br> For more information, see: <li>[Specification: RetinaNet](https://paperswithcode.com/lib/detectron2/retinanet) <li>[Paper: RetinaNet](https://arxiv.org/pdf/1708.02002.pdf)<li>[Documentation: RetinaNet](https://detectron2.readthedocs.io/en/latest/tutorials/training.html)                                                                             |
| Face Detection                 | Face detector based on MobileNetV2 as a backbone for indoor and outdoor scenes shot by a front-facing camera. <br> <br><br> For more information, see: <li>[Site: Face Detection 0205](https://docs.openvino.ai/latest/omz_models_model_face_detection_0205.html)                                                                                                                                                              |

<!--lint enable maximum-line-length-->

## Trackers

Trackers are part of **AI** and **OpenCV** tools.

Use trackers to identify and label
objects in a video or image sequence
that are moving or changing over time.

### AI tools: annotate with trackers

To annotate with trackers, do the following:

1. Click **Magic wand** ![Magic wand](/images/image189.jpg), and go to the **Trackers** tab.

   <br>![Start tracking an object](/images/trackers_tab.jpg)

2. From the **Label** drop-down, select the label for the object.
3. From **Tracker** drop-down, select tracker.
4. Click **Track**, and annotate the objects with the bounding box in the first frame.
5. Go to the top menu and click **Next** (or the **F** on the keyboard)
   to move to the next frame.
   <br>All annotated objects will be automatically tracked.

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

### When tracking

- To enable/disable tracking, use **Tracker switcher** on the sidebar.

  ![Tracker switcher](/images/tracker_switcher.jpg)

- Trackable objects have an indication on canvas with a model name.

  ![Tracker indication](/images/tracker_indication_detrac.jpg)

- You can follow the tracking by the messages appearing at the top.

  ![Tracker pop-up window](/images/tracker_pop-up_window.jpg)

### Trackers models

<!--lint disable maximum-line-length-->

| Model                         | Tool     | Description                                                                                                                                                                                                                                                                                                                                                                                                                                            | Example                                                       |
| ----------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| TrackerMIL                    | OpenCV   | TrackerMIL model is not bound to <br>labels and can be used for any <br>object. It is a fast client-side model <br>designed to track simple non-overlapping objects. <br><br>For more information, see: <li>[Article: Object Tracking using OpenCV](https://learnopencv.com/tag/mil/)                                                                                                                                                                  | ![Annotation using a tracker](/images/tracker_mil_detrac.gif) |
| SiamMask                      | AI Tools | Fast online Object Tracking and Segmentation. The trackable object will <br>be tracked automatically if the previous frame <br>was the latest keyframe for the object. <br><br>For more information, see:<li> [GitHub: SiamMask](https://github.com/foolwood/SiamMask) <li> [Paper: SiamMask](https://arxiv.org/pdf/1812.05050.pdf)                                                                                                                    | ![Annotation using a tracker](/images/tracker_ai_tools.gif)   |
| Transformer Tracking (TransT) | AI Tools | Simple and efficient online tool for object tracking and segmentation. <br>If the previous frame was the latest keyframe <br>for the object, the trackable object will be tracked automatically.<br>This is a modified version of the PyTracking <br> Python framework based on Pytorch<br> <br><br>For more information, see: <li> [GitHub: TransT](https://github.com/chenxin-dlut/TransT)<li> [Paper: TransT](https://arxiv.org/pdf/2103.15436.pdf) | ![Annotation using a tracker](/images/tracker_transit.gif)    |

<!--lint enable maximum-line-length-->

## OpenCV: histogram equalization

**Histogram equalization** improves
the contrast by stretching the intensity range.

It increases the global contrast of images
when its usable data is represented by close contrast values.

It is useful in images with backgrounds
and foregrounds that are bright or dark.

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
