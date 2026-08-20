---
title: 'Overview'
linkTitle: 'Overview'
weight: 1
description: 'Automatic annotation of tasks'
aliases:
  - /docs/manual/advanced/automatic-annotation/
---

Automatic annotation in CVAT is a tool that you can use
to automatically pre-annotate your data with pre-trained models.

To use automatic annotation, you must be able to access at least one
AI model of type "detector" or "reidentifier" on the CVAT instance.
Consult {{< ilink "/docs/annotation/auto-annotation/ai-models" >}}
for information on available sources of AI models.

To start automatic annotation, do the following:

1. On the top menu, click **Tasks**.
1. Find the task you want to annotate and click **Action** > **Automatic annotation**.

   ![Task with opened "Actions" menu](/images/image119_detrac.jpg)

1. In the Automatic annotation dialog, from the drop-down list, select a model.
1. [Match the labels](#labels-matching) of the model and the task.
1. (Optional) In case you need the model to return masks as polygons, switch toggle **Return masks as polygons**.
1. (Optional) In case you need to remove all previous annotations, switch toggle **Clean old annotations**.
1. (Optional) You can specify a **Threshold** for the model.
    If not provided, the default value from the model settings will be used.
1. (Optional) For detector models in 2D tasks, specify a **Region of interest**.
    This limits annotation to a selected image area.

   ![Automatic annotation window displaying the selected YOLOv3 model and parameters](/images/running_automatic_annotation.png)

1. Click **Annotate**.

CVAT will show the progress of annotation on the progress bar.

![Progress bar](/images/image121_detrac.jpg)

You can stop the automatic annotation at any moment by clicking cancel.

## Limiting automatic annotation input to a region of interest

For detector models in 2D tasks, you can restrict automatic annotation
to a selected image area.

To set the region, enter **Region of interest** values:
`x`, `y`, `width`, and `height`.

<img src="/images/auto_annotation_roi.png" alt="Automatic annotation dialog with Region of interest inputs" style="max-width: 400px;">

When a region of interest is set, CVAT sends only that image crop
to the model. The resulting annotations are added back to the task
in the correct full-frame coordinates.

Region of interest is supported for detector models, including
Nuclio functions, Hugging Face and Roboflow models, and native
AI-agent detector functions.

Region of interest is not supported for tracking or ReID functions.
For task-level annotation, **all processed frames must have the same resolution**,
and the selected region must fit inside every processed frame.

## Labels matching

Each model is trained on a dataset and supports only the dataset's labels.

For example:

- DL model has the label `car`.
- Your task (or project) has the label `vehicle`.

To annotate, you need to match these two labels to give
CVAT a hint that, in this case, `car` = `vehicle`.

If you have a label that is not on the list
of DL labels, you will not be able to
match them.

For this reason, supported DL models are suitable only
for certain labels.

To check the list of labels for each model, see [Models](#models)
papers and official documentation.
