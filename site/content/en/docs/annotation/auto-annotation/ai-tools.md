---
title: 'AI Tools'
linkTitle: 'AI tools'
weight: 14
description: 'Overview of semi-automatic and automatic annotation tools available in CVAT.'
aliases:
- /docs/manual/advanced/ai-tools/
- /docs/annotation/tools/ai-tools/
---

Label and annotate your data in semi-automatic and automatic mode with the help of **AI** and **OpenCV** tools.

While {{< ilink
 "/docs/annotation/manual-annotation/shapes/annotation-with-polygons/track-mode-with-polygons" "interpolation" >}}
is good for annotation of the videos made by the security cameras,
**AI** and **OpenCV** tools are good for both:
videos where the camera is stable and videos, where it
moves together with the object, or movements of the object are chaotic.

See:

- [Interactors](#interactors)
  - [AI tools: annotate with interactors](#ai-tools-annotate-with-interactors)
  - [Limiting interactor input to a region of interest](#limiting-interactor-input-to-a-region-of-interest)
  - [AI tools: add extra points](#ai-tools-add-extra-points)
  - [AI tools: delete points](#ai-tools-delete-points)
  - [OpenCV: intelligent scissors](#opencv-intelligent-scissors)
  - [Settings](#settings)
- [Detectors](#detectors)
  - [Labels matching](#labels-matching)
  - [Annotate with detectors](#annotate-with-detectors)
  - [Limiting detector input to a region of interest](#limiting-detector-input-to-a-region-of-interest)
- [Trackers](#trackers)
  - [AI tools: annotate with trackers](#ai-tools-annotate-with-trackers)
  - [OpenCV: annotate with trackers](#opencv-annotate-with-trackers)
  - [When tracking](#when-tracking)
- [OpenCV: histogram equalization](#opencv-histogram-equalization)

## Interactors

Interactors are a part of **AI** and **OpenCV** tools.

Use interactors to label objects in images by
creating a polygon semi-automatically.

When creating a polygon, you can use positive points
or negative points (for some models):

- **Positive points** define the area in which the object is located.
- **Negative points** define the area in which the object is not located.

![Annotated object with positive and negative points](/images/image188_detrac.jpg)

### AI tools: annotate with interactors

To annotate with interactors, do the following:

1. Click **Magic wand** ![Magic wand icon](/images/image189.jpg), and go to the **Interactors** tab.
2. From the **Label** drop-down, select a label for the polygon.
3. From the **Interactor** drop-down, select a model
   (see {{< ilink "/docs/annotation/auto-annotation/ai-models" >}}).
   <br>Click the **Question mark** to see information about each model:
   <br>![AI Tools interface with open Model information tooltip](/images/image114_detrac.jpg)
4. (Optional) If the model returns masks, and you need to
   convert masks to polygons, use the **Convert masks to polygons** toggle.
5. Click **Interact**.
6. Use the left click to add positive points and the right click to add negative points.
   <br>Number of points you can add depends on the model.
7. On the top menu, click **Done** (or **Shift+N**, **N**).

### Limiting interactor input to a region of interest

For image/video jobs, you can restrict an interactor to a selected image area.
Use this when you want the model to segment only a specific part of the frame.

To set the region:

1. In the **Interactors** tab, specify **Region of interest** values:
   `x`, `y`, `width`, and `height`.
2. Alternatively, click **Draw a region of interest** and draw the area on the canvas.
3. Click **Interact** and place points or boxes inside the selected region.

<img src="/images/interactors_roi.png" alt="Interactors tab with Region of interest inputs" style="max-width: 400px;">

When a region of interest is set, CVAT sends only that image crop to the model,
restricts interactor prompts to the selected area, and adds the resulting shape
back in the correct full-frame position.

### AI tools: add extra points

{{% alert title="Note" color="primary" %}}
More points improve outline accuracy, but make shape editing harder.
Fewer points make shape editing easier, but reduce outline accuracy.
{{% /alert %}}

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

![Slider for point number in polygon](/images/image224.jpg)

### AI tools: delete points

<br>To delete a point, do the following:

1. With the cursor, hover over the point you want to delete.
2. If the point can be deleted, it will enlarge and the cursor will turn into a cross.
3. Left-click on the point.

### OpenCV: intelligent scissors

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

### Settings

- On how to adjust the polygon,
  see {{< ilink "/docs/annotation/annotation-editor/objects-sidebar" "Objects sidebar" >}}.

- For more information about polygons in general, see
  {{< ilink "/docs/annotation/manual-annotation/shapes/annotation-with-polygons" "Annotation with polygons" >}}.

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

You can check each deployed model's supported labels
at the {{< ilink "/docs/workspace/models" "Models page" >}}.

### Annotate with detectors

To annotate with detectors, do the following:

1. Click **Magic wand** ![Magic wand icon](/images/image189.jpg), and go to the **Detectors** tab.
2. From the **Model** drop-down, select model
   (see {{< ilink "/docs/annotation/auto-annotation/ai-models" >}}).
3. From the left drop-down select the DL model label, from the right drop-down
   select the matching label of your task.

   ![Detectors tab with YOLO v3 model selected and matching labels](/images/detectors_tab.png)

4. (Optional) If the model returns masks, and you
   need to convert masks to polygons, use the **Convert masks to polygons** toggle.
5. (Optional) You can specify a **Threshold** for the model. If not provided, the
    default value from the model settings will be used.
6. Click **Annotate**.

This action will automatically annotate one frame.
For automatic annotation of multiple frames,
see {{< ilink "/docs/annotation/auto-annotation/automatic-annotation" "Automatic annotation" >}}.

### Limiting detector input to a region of interest

For image/video jobs, you can restrict a detector to a selected image area.
Use this when only part of the frame should be analyzed.

To set the region:

1. In the **Detectors** tab, specify **Region of interest** values:
   `x`, `y`, `width`, and `height`.
2. Alternatively, click **Draw a region of interest** and draw the area on the canvas.
3. Click **Annotate**.

<img src="/images/detectors_roi.png" alt="Detectors tab with Region of interest inputs" style="max-width: 400px;">

CVAT sends only the selected image crop to the detector and maps the returned
annotations back to the correct full-frame coordinates.

## Trackers

Trackers are part of **AI** and **OpenCV** tools.

Use trackers to identify and label
objects in a video or image sequence
that are moving or changing over time.

### AI tools: annotate with trackers

To annotate with trackers, do the following:

1. Click **Magic wand** ![Magic wand icon](/images/image189.jpg), and go to the **Trackers** tab.

   <br>![Trackers tab with selected label and tracker](/images/trackers_tab.jpg)

2. From the **Label** drop-down, select the label for the object.
3. From **Tracker** drop-down, select tracker.
4. Click **Track**, and annotate the objects with the bounding box in the first frame.
5. Go to the top menu and click **Next** (or the **F** on the keyboard)
   to move to the next frame.
   <br>All annotated objects will be automatically tracked.

### When tracking

- To enable/disable tracking, use **Tracker switcher** on the sidebar.

  ![Object interface with highlighted Tracker switcher](/images/tracker_switcher.png)

- Trackable objects have an indication on canvas with a model name.

  ![Annotated object displaying Tracker indication with model name](/images/tracker_indication_detrac.png)

- You can follow the tracking by the messages appearing at the top.

  ![Example of interface messages about tracking process](/images/tracker_pop-up_window.png)

### OpenCV: annotate with trackers

To annotate with trackers, do the following:

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
   <br>![Image tab in OpenCV window with highlighted histogram equalization button](/images/image221.jpg)

**Histogram equalization** will improve
contrast on current and following
frames.

Example of the result:

![Example of original image and image with applied histogram equalization](/images/image222.jpg)

To disable **Histogram equalization**, click on the button again.
