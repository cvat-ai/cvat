---
title: 'AI models'
description: 'AI model usage within CVAT, model deployment methods and predefined models'
---

CVAT's AI features use AI models, which can be added via several methods, namely:

- Nuclio functions.
- Functions powered by third-party services (Hugging Face and Roboflow).
- Functions powered by CVAT AI agents (also known as native functions).

The following table shows the availability of each model deployment method
across CVAT editions:

| Method | CVAT Community | CVAT Enterprise | CVAT Online |
| ------ | -------------- | --------------- | ----------- |
| Nuclio functions | Yes | Yes | Certain functions only |
| Third-party functions | No | Yes | Yes |
| Native functions | No | Yes | Yes |

Each function has a certain kind,
which determines the tools that can use it in the CVAT UI.
The following kinds are defined:

| Kind | Used by |
| ---- | ------- |
| Detector | {{< ilink "/docs/annotation/auto-annotation/ai-tools" "AI Tools" >}} (the "Detectors" tab), as well as {{< ilink "/docs/annotation/auto-annotation/automatic-annotation" "automatic annotation" >}} |
| Interactor | AI Tools (the "Interactors" tab) |
| Reidentifier | Automatic annotation |
| Tracker | Depending on the shape types supported by the tracker, either AI Tools (the "Trackers" tab) or annotation actions |

## Nuclio functions

A Nuclio function is a Docker container that runs
on the same host or Kubernetes cluster as CVAT itself
and processes inference requests that come from it.
To add a Nuclio function to CVAT,
a system administrator must build and deploy it.
Consult the {{< ilink "/docs/guides/serverless-tutorial" "serverless tutorial" >}}
for more information.

Once deployed, a Nuclio function is available to every user of the CVAT instance.

Nuclio functions can have any kind.

A Nuclio function can be built from custom source code
and thus be internally implemented in any way that fits the interface expected by CVAT.
However, the [CVAT source repository](https://github.com/cvat-ai/cvat)
also includes several predefined Nuclio functions in source code form,
which can be used either directly or as examples for building custom functions.
In addition, CVAT Enterprise customers gain access to additional predefined functions,
including the SAM 2 Tracker.
Consult {{< ilink "/docs/annotation/auto-annotation/segment-anything-2-tracker" >}}
for more information.

### Predefined Nuclio functions

The following predefined function implementations are available
in the `serverless` directory of the source repository.

#### Interactors

| Model                                                     | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Example                                           |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Inside-Outside Guidance<br>(IOG)                          | The model uses a bounding box and inside/outside points to create a mask. <br>First of all, you need to create a bounding box, wrapping the object. <br>Then you need to use positive and negative points to say the model where is a foreground, and where is a background.<br>Negative points are optional. <br><br>For more information, see: <li>[GitHub: IOG](https://github.com/shiyinzhang/Inside-Outside-Guidance) <li>[Paper: IOG](https://openaccess.thecvf.com/content_CVPR_2020/papers/Zhang_Interactive_Object_Segmentation_With_Inside-Outside_Guidance_CVPR_2020_paper.pdf) | ![Example of annotation process using Inside-Outside-Guidance model](/images/iog_example.gif) |
| Segment Anything Model (SAM)                              | The Segment Anything Model (SAM) produces high quality object masks, and it can be used to generate masks for all objects in an image. It has been trained on a dataset of 11 million images and 1.1 billion masks, and has strong zero-shot performance on a variety of segmentation tasks. <br><br>For more information, see: <li>[GitHub: Segment Anything](https://github.com/facebookresearch/segment-anything) <li>[Site: Segment Anything](https://segment-anything.com/)<li>[Paper: Segment Anything](https://ai.facebook.com/research/publications/segment-anything/)               | ![Example of annotation process using Segment Anything Model](/images/interactors_SAM.gif) |

#### Detectors

| Model                          | Description                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Face Detection                 | Face detector based on MobileNetV2 as a backbone for indoor and outdoor scenes shot by a front-facing camera. <br> <br><br> For more information, see: <li>[Site: Face Detection 0205](https://docs.openvino.ai/latest/omz_models_model_face_detection_0205.html) |
| Faster RCNN with Tensorflow    | Faster RCNN version with Tensorflow. The model generates bounding boxes for each instance of an object in the image. <br>In this model, RPN and Fast R-CNN are combined into a single network. <br><br> For more information, see: <li>[Site: Faster RCNN with Tensorflow](https://docs.openvino.ai/2021.4/omz_models_model_faster_rcnn_inception_v2_coco.html) <li>[Paper: Faster RCNN](https://arxiv.org/pdf/1506.01497.pdf) |
| Mask RCNN                      | The model generates polygons for each instance of an object in the image. <br><br> For more information, see: <li>[GitHub: Mask RCNN](https://github.com/matterport/Mask_RCNN) <li>[Paper: Mask RCNN](https://arxiv.org/pdf/1703.06870.pdf) |
| RetinaNet                      | Pytorch implementation of RetinaNet object detection. <br> <br><br> For more information, see: <li>[Specification: RetinaNet](https://paperswithcode.com/lib/detectron2/retinanet) <li>[Paper: RetinaNet](https://arxiv.org/pdf/1708.02002.pdf)<li>[Documentation: RetinaNet](https://detectron2.readthedocs.io/en/latest/tutorials/training.html) |
| YOLO v7                        | YOLOv7 is an advanced object detection model that outperforms other detectors in terms of both speed and accuracy. It can process frames at a rate ranging from 5 to 160 frames per second (FPS) and achieves the highest accuracy with 56.8% average precision (AP) among real-time object detectors running at 30 FPS or higher on the V100 graphics processing unit (GPU). <br><br> For more information, see: <li>[GitHub: YOLO v7](https://github.com/WongKinYiu/yolov7) <li>[Paper: YOLO v7](https://arxiv.org/pdf/2207.02696.pdf) |

#### Trackers

| Model                         | Description                                                                                                                                                                                                                                                                                                                                                                                                                                            | Example                                                       |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| Transformer Tracking (TransT) | Simple and efficient online tool for object tracking and segmentation. <br>If the previous frame was the latest keyframe for the object, the trackable object will be tracked automatically.<br>This is a modified version of the PyTracking Python framework based on Pytorch<br> <br><br>For more information, see: <li> [GitHub: TransT](https://github.com/chenxin-dlut/TransT)<li> [Paper: TransT](https://arxiv.org/pdf/2103.15436.pdf) | ![Example of annotation process using Transformer Tracking](/images/tracker_transit.gif) |

### Nuclio functions in CVAT Online

Since CVAT Online is administered by CVAT.ai Corporation,
users may not add custom Nuclio functions to it.
However, CVAT.ai makes several functions from the lists above
available in CVAT Online.
The exact set of available functions may vary over time at CVAT.ai's discretion.

## Third-party functions

{{< product-badge "online,enterprise" >}}

A third-party function is a resource stored in CVAT
that comprises a URL to a model in a third-party inference service
and a credential used to access that service.
This third-party service is called
when the function is used as a model in the CVAT UI.

The following services are currently supported:

- [Hugging Face](https://huggingface.co/).

  To be usable from CVAT, a model hosted in Hugging Face must support the Inference API,
  which can be verified by checking that the "Inference Providers" gadget on the model page
  lists "HF Inference API" as one of the providers.
  Additionally, the model's task must be "Image Classification", "Image Segmentation", or
  "Object Detection".

- [Roboflow](https://roboflow.com/).

  To be usable from CVAT, a model hosted in Roboflow must have task type
  "Classification", "Instance Segmentation", "Object Detection", or "Semantic Segmentation".

A third-party function can be created via the CVAT UI
on the {{< ilink "/docs/workspace/models" "Models page" >}}.

Any user may create a third-party function to their personal workspace,
in which case it will only be usable by them.

Alternatively, an organization maintainer may create a third-party function within the organization.
In this case, the function will be usable by all other members of the organization.

Third-party functions always have kind "detector".

For a walkthrough of this feature,
see [Streamline annotation by integrating Hugging Face and Roboflow models](https://www.cvat.ai/post/integrating-hugging-face-and-roboflow-models).

This video demonstrates the process:

<iframe width="560" height="315" src="https://www.youtube.com/embed/SbU3aB65W5s" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>

## Native functions

{{< product-badge "online,enterprise" >}}

A native function is a resource stored in CVAT
that contains only meta-information, such as its type, label specifications,
or the number of points the user must place to interact with it.
A native function cannot be used just by itself;
instead, its owner must power it
by running one or more CVAT AI Agents on their own infrastructure.
These agents will wait for requests from CVAT, process them, and upload
the results back to CVAT.

To create and power a native function, you will need to do the following:

1. Implement an object in Python
   that implements the {{< ilink "/docs/api_sdk/sdk/auto-annotation#auto-annotation-interface"
   "auto-annotation function interface" >}} in the CVAT SDK.

2. Use the `function create-native` subcommands of {{< ilink "/docs/api_sdk/cli" "CVAT CLI" >}}
   to create the function on the server.

3. Use the `function run-agent` subcommand of CVAT CLI to run one or more agents.

There are three possible scopes in which a native function can be created:

- Any user can create a function in their personal workspace.
  In this case, it will only be accessible to them.

  This will be the default
  if no relevant options are passed to the `function create-native` subcommand.

- An organization maintainer may create a function within the organization.
  In this case, it will be accessible by all members of the organization.

  To do this, pass the `--org=<SLUG>` option
  to the `function create-native` and `function run-agent` subcommands.

- A CVAT instance administrator may create a public function.
  In this case, it will be accessible by all users of the instance.

  To do this, pass the `--visibility=public` option
  to the `function create-native` subcommand.

Native functions can have kinds "detector", "interactor", and "tracker".

### Predefined native functions

The [cvat-models](https://github.com/cvat-ai/cvat-models) repository
contains several native function implementations
based on popular AI models and model libraries.
These can be used directly or as examples for implementing custom functions.

This includes a tracker function based on SAM 2.
Consult {{< ilink "/docs/annotation/auto-annotation/segment-anything-2-tracker" >}}
for more information.
