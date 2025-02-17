---
title: 'Automatic annotation'
linkTitle: 'Automatic annotation'
weight: 16
description: 'Automatic annotation of tasks'
---

Automatic annotation in CVAT is a tool that you can use
to automatically pre-annotate your data with pre-trained models.

CVAT can use models from the following sources:

- [Pre-installed models](#models).
- Models integrated from [Hugging Face and Roboflow](#adding-models-from-hugging-face-and-roboflow).
- {{< ilink "/docs/manual/advanced/serverless-tutorial" "Self-hosted models deployed with Nuclio" >}}.

The following table describes the available options:

|                                             | Self-hosted            | Cloud                                            |
| ------------------------------------------- | ---------------------- | ------------------------------------------------ |
| **Price**                                   | Free                   | See [Pricing](https://www.cvat.ai/pricing/cloud) |
| **Models**                                  | You have to add models | You can use pre-installed models                 |
| **Hugging Face & Roboflow <br>integration** | Not supported          | Supported                                        |

See:

- [Running Automatic annotation](#running-automatic-annotation)
- [Labels matching](#labels-matching)
- [Models](#models)
- [Adding models from Hugging Face and Roboflow](#adding-models-from-hugging-face-and-roboflow)

## Running Automatic annotation

To start automatic annotation, do the following:

1. On the top menu, click **Tasks**.
1. Find the task you want to annotate and click **Action** > **Automatic annotation**.

   ![](/images/image119_detrac.jpg)

1. In the Automatic annotation dialog, from the drop-down list, select a [model](#models).
1. [Match the labels](#labels-matching) of the model and the task.
1. (Optional) In case you need the model to return masks as polygons, switch toggle **Return masks as polygons**.
1. (Optional) In case you need to remove all previous annotations, switch toggle **Clean old annotations**.
1. (Optional) You can specify a **Threshold** for the model.
    If not provided, the default value from the model settings will be used.

   ![](/images/running_automatic_annotation.png)

1. Click **Annotate**.

CVAT will show the progress of annotation on the progress bar.

![Progress bar](/images/image121_detrac.jpg)

You can stop the automatic annotation at any moment by clicking cancel.

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

## Models

Automatic annotation uses pre-installed and added models.

> For self-hosted solutions,
> you need to
> {{< ilink "/docs/administration/advanced/installation_automatic_annotation" "install Automatic Annotation first" >}}
> and {{< ilink "/docs/manual/advanced/models" "add models" >}}.

List of pre-installed models:

<!--lint disable maximum-line-length-->

| Model                     | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Attributed face detection | Three OpenVINO models work together: <br><br><li> [Face Detection 0205](https://docs.openvino.ai/2022.3/omz_models_model_face_detection_0205.html): face detector based on MobileNetV2 as a backbone with a FCOS head for indoor and outdoor scenes shot by a front-facing camera. <li>[Emotions recognition retail 0003](https://docs.openvino.ai/2022.3/omz_models_model_emotions_recognition_retail_0003.html#emotions-recognition-retail-0003): fully convolutional network for recognition of five emotions (‘neutral’, ‘happy’, ‘sad’, ‘surprise’, ‘anger’). <li>[Age gender recognition retail 0013](https://docs.openvino.ai/2022.3/omz_models_model_age_gender_recognition_retail_0013.html): fully convolutional network for simultaneous Age/Gender recognition. The network can recognize the age of people in the [18 - 75] years old range; it is not applicable for children since their faces were not in the training set. |
| RetinaNet R101            | RetinaNet is a one-stage object detection model that utilizes a focal loss function to address class imbalance during training. Focal loss applies a modulating term to the cross entropy loss to focus learning on hard negative examples. RetinaNet is a single, unified network composed of a backbone network and two task-specific subnetworks. <br><br>For more information, see: <li>[Site: RetinaNET](https://paperswithcode.com/lib/detectron2/retinanet)                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Text detection            | Text detector based on PixelLink architecture with MobileNetV2, depth_multiplier=1.4 as a backbone for indoor/outdoor scenes. <br><br> For more information, see: <li>[Site: OpenVINO Text detection 004](https://docs.openvino.ai/2022.3/omz_models_model_text_detection_0004.html)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| YOLO v3                   | YOLO v3 is a family of object detection architectures and models pre-trained on the COCO dataset. <br><br> For more information, see: <li>[Site: YOLO v3](https://docs.openvino.ai/2022.3/omz_models_model_yolo_v3_tf.html)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| YOLO v7                   | YOLOv7 is an advanced object detection model that outperforms other detectors in terms of both speed and accuracy. It can process frames at a rate ranging from 5 to 160 frames per second (FPS) and achieves the highest accuracy with 56.8% average precision (AP) among real-time object detectors running at 30 FPS or higher on the V100 graphics processing unit (GPU). <br><br> For more information, see: <li>[GitHub: YOLO v7](https://github.com/WongKinYiu/yolov7) <li>[Paper: YOLO v7](https://arxiv.org/pdf/2207.02696.pdf)                                                                                                                                                                                                                                                                                                                                                                                                    |

<!--lint enable maximum-line-length-->

## Adding models from Hugging Face and Roboflow

In case you did not find the model you need, you can add a model
of your choice from [Hugging Face](https://huggingface.co/)
or [Roboflow](https://roboflow.com/).

> **Note**, that you cannot add models from Hugging Face and Roboflow to self-hosted CVAT.

<!--lint disable maximum-line-length-->

For more information,
see [Streamline annotation by integrating Hugging Face and Roboflow models](https://www.cvat.ai/post/integrating-hugging-face-and-roboflow-models).

This video demonstrates the process:

<iframe width="560" height="315" src="https://www.youtube.com/embed/SbU3aB65W5s" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>

<!--lint enable maximum-line-length-->
