---
title: 'AI assistance'
linkTitle: 'AI assistance'
weight: 14
description: 'Overview of semi-automatic and automatic annotation tools available in CVAT.'
aliases:
- /docs/manual/advanced/ai-tools/
- /docs/annotation/tools/ai-tools/
---

Use **AI assistance** to annotate images and videos with visual prompts, automatic models, and tracking.

The **AI assistance** dialog has three tabs: **Prompting**, **Auto-labeling**, and **Tracking**.
In each tab, the **Model** drop-down includes **Add your own model**, which opens the
{{< ilink "/docs/annotation/auto-annotation/ai-models#native-functions" "AI agent setup instructions" >}}
in a new browser tab.

See:

- [Prompting](#interactors)
  - [Annotate with visual prompts](#ai-tools-annotate-with-interactors)
  - [Limit visual prompts to a region of interest](#limiting-interactor-input-to-a-region-of-interest)
  - [Add extra points](#ai-tools-add-extra-points)
  - [Delete points](#ai-tools-delete-points)
  - [Settings](#settings)
- [Auto-labeling](#detectors)
  - [Labels matching](#labels-matching)
  - [Annotate automatically](#annotate-with-detectors)
  - [Limit automatic annotation to a region of interest](#limiting-detector-input-to-a-region-of-interest)
- [Tracking](#trackers)
  - [Track objects](#ai-tools-annotate-with-trackers)
  - [When tracking](#when-tracking)

## Prompting {#interactors}

Use **Prompting** to create masks or polygons from points or bounding boxes, depending on the model.
These models are called _interactors_ in the SDK.

For models that support point prompts:

- **Positive points** define the area in which the object is located.
- **Negative points** define the area in which the object is not located.

![Annotated object with positive and negative points](/images/image188_detrac.jpg)

### Annotate with visual prompts {#ai-tools-annotate-with-interactors}

To annotate with visual prompts, do the following:

1. Click **Magic wand** <img src="/images/ai-assistance-icon.svg" alt="Magic wand icon" width="24" height="24">, and go to the **Prompting** tab.
2. From the **Model** drop-down, select a model
   (see {{< ilink "/docs/annotation/auto-annotation/ai-models" >}}).
   <br>Click the **Question mark** to see information about each model:

   <img src="/images/ai-assistance-prompting-model-info.webp"
        alt="Prompting tab with model information tooltip"
        style="display: block; margin: 0 auto; width: 100%; max-width: 650px; height: auto; border: 1px solid #d9d9d9; border-radius: 8px;">

3. From the **Label** drop-down, select a label for the object.
4. (Optional) If the model returns masks, and you need to
   convert masks to polygons, use the **Convert masks to polygons** toggle.
5. Click **Add visual prompts**.
6. Use the left click to add positive points and the right click to add negative points.
   <br>Number of points you can add depends on the model.
7. On the top menu, click **Done** (or **Shift+N**, **N**).

### Limit visual prompts to a region of interest {#limiting-interactor-input-to-a-region-of-interest}

For image/video jobs, you can restrict visual prompts to a selected image area.
Use this when you want the model to segment only a specific part of the frame.

To set the region:

1. In the **Prompting** tab, specify **Region of interest** values:
   `x`, `y`, `width`, and `height`.
2. Alternatively, click **Draw a region of interest** and draw the area on the canvas.

   <img src="/images/ai-assistance-prompting-roi.webp"
        alt="Prompting tab with region of interest controls highlighted"
        style="display: block; margin: 0 auto; width: 100%; max-width: 650px; height: auto; border: 1px solid #d9d9d9; border-radius: 8px;">

3. Click **Add visual prompts** and place points or boxes inside the selected region.

When a region of interest is set, CVAT sends only that image crop to the model,
restricts visual prompts to the selected area, and adds the resulting shape
back in the correct full-frame position.

### Add extra points {#ai-tools-add-extra-points}

{{% alert title="Note" color="primary" %}}
More points improve outline accuracy, but make shape editing harder.
Fewer points make shape editing easier, but reduce outline accuracy.
{{% /alert %}}

Each model has a minimum required number of points for annotation.
Once the required number of points is reached, the request
is automatically sent to the server.
The server processes the request and adds a polygon to the frame.

In case you used **Mask to polygon** when the object is finished,
you can edit it like a polygon.

You can change the number of points in the
polygon with the slider:

![Slider for point number in polygon](/images/image224.jpg)

### Delete points {#ai-tools-delete-points}

<br>To delete a point, do the following:

1. With the cursor, hover over the point you want to delete.
2. If the point can be deleted, it will enlarge and the cursor will turn into a cross.
3. Left-click on the point.

### Settings

- On how to adjust the polygon,
  see {{< ilink "/docs/annotation/annotation-editor/objects-sidebar" "Objects sidebar" >}}.

- For more information about polygons in general, see
  {{< ilink "/docs/annotation/manual-annotation/shapes/annotation-with-polygons" "Annotation with polygons" >}}.

## Auto-labeling {#detectors}

Use **Auto-labeling** to annotate a frame automatically. Depending on the model, results can include
bounding boxes, masks, tags, or poses.

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

### Annotate automatically {#annotate-with-detectors}

To annotate automatically, do the following:

1. Click **Magic wand** <img src="/images/ai-assistance-icon.svg" alt="Magic wand icon" width="24" height="24">, and go to the **Auto-labeling** tab.
2. From the **Model** drop-down, select model
   (see {{< ilink "/docs/annotation/auto-annotation/ai-models" >}}).
3. From the left drop-down select the DL model label, from the right drop-down
   select the matching label of your task.

   <img src="/images/ai-assistance-auto-labeling.webp"
        alt="Auto-labeling tab with YOLO v7 and label mapping"
        style="display: block; margin: 0 auto; width: 100%; max-width: 650px; height: auto; border: 1px solid #d9d9d9; border-radius: 8px;">

4. (Optional) If the model returns masks, and you
   need to convert masks to polygons, use the **Convert masks to polygons** toggle.
5. (Optional) You can specify a **Threshold** for the model. If not provided, the
    default value from the model settings will be used.
6. Click **Annotate**.

This action will automatically annotate one frame.
For automatic annotation of multiple frames,
see {{< ilink "/docs/annotation/auto-annotation/automatic-annotation" "Automatic annotation" >}}.

### Limit automatic annotation to a region of interest {#limiting-detector-input-to-a-region-of-interest}

For image/video jobs, you can restrict automatic annotation to a selected image area.
Use this when only part of the frame should be analyzed.

To set the region:

1. In the **Auto-labeling** tab, specify **Region of interest** values:
   `x`, `y`, `width`, and `height`.
2. Alternatively, click **Draw a region of interest** and draw the area on the canvas.

   <img src="/images/ai-assistance-auto-labeling-roi.webp"
        alt="Auto-labeling tab with region of interest controls highlighted"
        style="display: block; margin: 0 auto; width: 100%; max-width: 650px; height: auto; border: 1px solid #d9d9d9; border-radius: 8px;">

3. Click **Annotate**.

CVAT sends only the selected image crop to the model and maps the returned
annotations back to the correct full-frame coordinates.

## Tracking {#trackers}

Use **Tracking** to follow objects across frames in a video or image sequence.

### Track objects {#ai-tools-annotate-with-trackers}

To track objects, do the following:

1. Click **Magic wand** <img src="/images/ai-assistance-icon.svg" alt="Magic wand icon" width="24" height="24">, and go to the **Tracking** tab.

   <img src="/images/ai-assistance-tracking.webp"
        alt="Tracking tab with TransT model and annotation label selected"
        style="display: block; margin: 0 auto; width: 100%; max-width: 650px; height: auto; border: 1px solid #d9d9d9; border-radius: 8px;">

2. From the **Model** drop-down, select a tracker.
3. From the **Label** drop-down, select the label for the object.
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
