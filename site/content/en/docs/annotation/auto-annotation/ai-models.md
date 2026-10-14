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

You can connect your own model to CVAT using `cvat-cli`.
The model runs on your machine as an **AI agent**: it receives requests from CVAT and sends back annotations.
CVAT stores the model's name, labels, and capabilities as a **native function**.

Agents support three kinds of functions:

- **Detectors** run automatically and produce boxes, masks, tags, or poses, depending on the model.
- **Interactors** use your prompts, such as points and bounding boxes,
  to annotate objects in **AI assistance → Prompting**.
- **Trackers** follow objects across frames, through **Tracking** or annotation actions depending on their shape types.

The setup has three steps:

1. [Prepare a Python function for your model](#use-another-model), **or choose a ready-to-use function below**.
2. Choose a deployment scope and register the model with `cvat-cli function create-native`.
3. Start the agent with `cvat-cli function run-agent` and keep it running while using the model in CVAT.

### Set up CVAT CLI

Run these commands on the machine that will run the model. The examples use a Linux/macOS shell and require Git
and a Python version supported by the model's dependencies.

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip cvat-cli
```

Create a {{< ilink "/docs/api_sdk/access_tokens" "Personal Access Token" >}} in CVAT, then configure your connection:

```bash
export CVAT_SERVER_URL="https://app.cvat.ai"
export CVAT_ACCESS_TOKEN="replace-with-your-token"
```

For Enterprise, use your instance URL instead of `https://app.cvat.ai`.

### Choose a deployment scope

Choose **one** of these settings before running the examples.

{{< tabpane text=true >}}

{{% tab header="Personal workspace" %}}

Only you can use the model.

```bash
export CVAT_ORG=""
```

{{% /tab %}}

{{% tab header="Organization workspace" %}}

Organization members can use the model.

```bash
export CVAT_ORG="your-organization-slug"
```

<div class="alert alert-primary" role="alert">
<h4 class="alert-heading"><i class="fas fa-circle-info" aria-hidden="true"></i> Note</h4>
<ul>
<li>Use the organization's <strong>slug</strong>, not its display name.</li>
<li>Registering an organization model requires the <strong>owner</strong> or <strong>maintainer</strong> role.</li>
</ul>
</div>

{{% /tab %}}

{{% tab header="Global deployment" %}}

**CVAT Enterprise only.** All users of the instance can use the model.

Use an instance administrator's token and set:

```bash
export CVAT_ORG=""
```

Add `--visibility=public` to the `create-native` command in your chosen example.
The `run-agent` command does not need this option.

{{% /tab %}}

{{< /tabpane >}}

### Ready-to-use models

The [cvat-ai/cvat-models repository](https://github.com/cvat-ai/cvat-models)
provides Python functions for supported models. You can use them directly without writing a wrapper:

| Example | What it does | Where to use it |
| ------- | ------------ | --------------- |
| YOLO | Detection, segmentation, or pose estimation | AI assistance → Auto-labeling |
| Hugging Face Transformers | Detection, segmentation, or classification | AI assistance → Auto-labeling |
| SAM2 tracking | Tracks an existing mask or polygon | Run annotation action |
| [SAM2 interactor](https://github.com/cvat-ai/cvat-models/tree/develop/interactor/sam2) | Segments objects from points and boxes | AI assistance → Prompting |

Clone the repository and run the examples from its directory:

```bash
git clone https://github.com/cvat-ai/cvat-models.git
cd cvat-models
```

Choose an example below. After registration, replace `<function_id>` (including the angle brackets)
with the numeric ID shown in the command output.
For example, if the output says `Created function #8`, use `8`.
Use the same model parameters and workspace when registering and starting the agent.
The examples use the CPU; for a GPU, install compatible CUDA-enabled PyTorch dependencies and change
`-p device=str:cpu` to `-p device=str:cuda` in both commands.

{{< tabpane text=true >}}

{{% tab header="Ultralytics YOLO" %}}

1. Install dependencies:

   ```bash
   python -m pip install --upgrade -r detector/yolo/requirements.txt
   ```

2. Register the model:

   ```bash
   cvat-cli --server-host "$CVAT_SERVER_URL" --org "$CVAT_ORG" function create-native "YOLO" \
     --function-file detector/yolo/func.py \
     -p model=str:yolo26n.pt -p device=str:cpu
   ```

3. Start the agent:

   ```bash
   cvat-cli --server-host "$CVAT_SERVER_URL" --org "$CVAT_ORG" function run-agent <function_id> \
     --function-file detector/yolo/func.py \
     -p model=str:yolo26n.pt -p device=str:cpu
   ```

In a CVAT job, select **AI assistance → Auto-labeling → Model → YOLO**, map the model labels to task labels, and run it.
You can also use the model for task automatic annotation.

The table shows example weights, not a complete list of supported models.
You can use other compatible numbered YOLO models, including newer versions supported by your installed
Ultralytics library and the CVAT YOLO function. These examples use
[YOLO26](https://docs.ultralytics.com/models/yolo26/).
See the [Ultralytics model catalog](https://docs.ultralytics.com/models/) for available weights and model capabilities.
YOLO-World and YOLOE are not supported by this CVAT function.
Use the same `model` value when registering the function and starting the agent.

| Purpose | Example `model` value |
| ------- | --------------------- |
| Detection | `str:yolo26n.pt` |
| Instance segmentation | `str:yolo26n-seg.pt` |
| Human pose estimation | `str:yolo26n-pose.pt` |
| Custom weights | `str:/absolute/path/to/best.pt` |

Pretrained weights are downloaded automatically. Pose models need a matching skeleton label in CVAT.
For custom pose keypoint names and supported models, see the
[YOLO README](https://github.com/cvat-ai/cvat-models/tree/develop/detector/yolo),
which also links to the Ultralytics licensing terms.

{{% /tab %}}

{{% tab header="Hugging Face Transformers" %}}

This example runs a DETR detector on your machine using the Transformers library.

1. Install dependencies:

   ```bash
   python -m pip install -r detector/transformers/requirements.txt
   ```

2. Register the model:

   ```bash
   cvat-cli --server-host "$CVAT_SERVER_URL" --org "$CVAT_ORG" function create-native "DETR" \
     --function-file detector/transformers/func.py \
     -p task=str:object-detection -p model=str:facebook/detr-resnet-50 -p device=str:cpu
   ```

3. Start the agent:

   ```bash
   cvat-cli --server-host "$CVAT_SERVER_URL" --org "$CVAT_ORG" function run-agent <function_id> \
     --function-file detector/transformers/func.py \
     -p task=str:object-detection -p model=str:facebook/detr-resnet-50 -p device=str:cpu
   ```

Select **AI assistance → Auto-labeling → Model → DETR**, map the labels, and run it.
For segmentation or classification, use the corresponding `task` and `model` values below in **both** commands.
Register each model as a separate function with a descriptive name.

| Purpose | `task` value | Example `model` value | Output |
| ------- | ------------ | --------------------- | ------ |
| Object detection | `str:object-detection` | `str:facebook/detr-resnet-50` | Boxes |
| Panoptic segmentation | `str:image-segmentation` | `str:facebook/detr-resnet-50-panoptic` | Masks |
| Semantic segmentation | `str:image-segmentation` | `str:nvidia/segformer-b0-finetuned-ade-512-512` | Masks |
| Image classification | `str:image-classification` | `str:google/vit-base-patch16-224` | Tags |

**Where to find more models**

- Check the CVAT agent's
  [expected-compatible model architectures](https://github.com/cvat-ai/cvat-models/blob/develop/detector/transformers/agent/supported_models).
  This lists architecture classes, not model IDs; it is not a guarantee that every checkpoint will work.
- Browse Hugging Face models filtered by
  [object detection](https://huggingface.co/models?pipeline_tag=object-detection&library=transformers),
  [image segmentation](https://huggingface.co/models?pipeline_tag=image-segmentation&library=transformers), or
  [image classification](https://huggingface.co/models?pipeline_tag=image-classification&library=transformers).
  Choose a model supported by the corresponding Transformers pipeline and check its model card for dependencies.

The model ID is the `owner/model-name` shown on its Hugging Face page.
See the [Transformers function README](https://github.com/cvat-ai/cvat-models/tree/develop/detector/transformers)
for supported parameters. These agents run locally; a hosted Hugging Face inference provider is not required.

{{% /tab %}}

{{% tab header="SAM2 interactor" %}}

Use points and bounding boxes to segment an object in the current frame.

1. Install dependencies:

   ```bash
   python -m pip install -r interactor/sam2/requirements.txt
   ```

2. Register the interactor:

   ```bash
   cvat-cli --server-host "$CVAT_SERVER_URL" --org "$CVAT_ORG" function create-native "SAM2 interactor" \
     --function-file interactor/sam2/func.py \
     -p model_id=str:facebook/sam2.1-hiera-tiny -p device=str:cpu
   ```

3. Start the agent:

   ```bash
   cvat-cli --server-host "$CVAT_SERVER_URL" --org "$CVAT_ORG" function run-agent <function_id> \
     --function-file interactor/sam2/func.py \
     -p model_id=str:facebook/sam2.1-hiera-tiny -p device=str:cpu
   ```

In a job, open **AI assistance → Prompting**, select **SAM2 interactor** and the annotation label,
then click **Add visual prompts**. Add points or a bounding box around the object, refine the mask with
positive and negative points, and finish the interaction to create the annotation.

In older CVAT versions, use **AI Tools → Interactors → Interact**.
See the [SAM2 interactor README](https://github.com/cvat-ai/cvat-models/tree/develop/interactor/sam2)
for model options.

{{% /tab %}}

{{% tab header="SAM2 tracking" %}}

1. Install dependencies:

   ```bash
   python -m pip install -r tracker/sam2/requirements.txt
   ```

2. Register the tracker:

   ```bash
   cvat-cli --server-host "$CVAT_SERVER_URL" --org "$CVAT_ORG" function create-native "SAM2 Tracker" \
     --function-file tracker/sam2/func.py \
     -p model_id=str:facebook/sam2.1-hiera-tiny -p device=str:cpu
   ```

3. Start the agent:

   ```bash
   cvat-cli --server-host "$CVAT_SERVER_URL" --org "$CVAT_ORG" function run-agent <function_id> \
     --function-file tracker/sam2/func.py \
     -p model_id=str:facebook/sam2.1-hiera-tiny -p device=str:cpu
   ```

In a video job, draw a mask or polygon, open its menu, and choose **Run annotation action → AI Tracker: SAM2**.
Set the target frame, click **Run**, and review the results. A GPU is recommended for practical tracking.

SAM2 tracks masks and polygons through annotation actions, not the sidebar's rectangle-based Tracking selector.
See {{< ilink "/docs/annotation/auto-annotation/segment-anything-2-tracker" "SAM2 tracking" >}}
for the full workflow and required enhanced actions plugin.

{{% /tab %}}

{{< /tabpane >}}

### After setup

Keep the agent terminal open while using the model. **Ctrl+C** stops the agent but leaves the model registered;
run the same `run-agent` command to restart it. To remove the model after stopping the agent:

```bash
cvat-cli --server-host "$CVAT_SERVER_URL" --org "$CVAT_ORG" function delete <function_id>
```

If the model is missing, check the selected server and workspace. If requests wait without results,
check the agent's terminal and function ID.
In older CVAT versions, **AI assistance → Auto-labeling** is named **AI Tools → Detectors**.

### Use another model

For a model without a ready-to-use function, implement the
{{< ilink "/docs/api_sdk/sdk/auto-annotation#auto-annotation-interface" "CVAT SDK function interface" >}}.
Start with the {{< ilink "/docs/api_sdk/sdk/auto-annotation#example" "Python detection function example" >}},
which shows how to load a model, define its labels, and return predictions in CVAT format.
For prompt-based models or trackers, see the
{{< ilink "/docs/api_sdk/sdk/auto-annotation#interaction-function-protocol" "interaction protocol" >}} or
{{< ilink "/docs/api_sdk/sdk/auto-annotation#tracking-function-protocol" "tracking protocol" >}}.

The {{< ilink "/docs/api_sdk/cli#auto-annotate" "CLI function-loading examples" >}}
explain how to expose a function through a Python file or a `create` factory and pass parameters with `-p`.
Then use the same registration and agent commands with your Python file and its parameters.
Native functions can be detectors, interactors, or trackers.

For container deployment, see the
{{< ilink "/docs/guides/compose-agents-userguide" "Docker Compose guide" >}} or
{{< ilink "/docs/guides/helm-agents-userguide" "Helm guide" >}}.
