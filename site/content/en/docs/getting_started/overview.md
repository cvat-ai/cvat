---
title: 'CVAT Overview'
linkTitle: 'CVAT Overview'
weight: 1
description:
---

CVAT is an enterprise-grade platform for managing high-quality visual
 datasets for computer vision applications.
It offers advanced tools for image, video, and 3D annotation,
built-in quality assurance (QA), automation, and secure team collaboration.

Backed by an active open-source community
 and trusted by thousands of organizations worldwide, CVAT helps organizations streamline data labeling for faster, more
 accurate model development.

 ---

 ## Editions and Services

CVAT comes in three editions: CVAT Community, CVAT Online, and CVAT Enterprise.

### CVAT Community

- Free edition you can deploy on-premises or in your own cloud
- Full annotation toolset, import/export formats, and core workflow
- Ideal for technical teams comfortable managing infrastructure
- {{< ilink "/docs/administration/basics/installation" "Installation & Setup Guide →" >}}
- [GitHub repository](https://github.com/cvat-ai/cvat)

### CVAT Online

- Hosted cloud edition with automatic updates, maintenance, and managed infrastructure.
- Available under multiple subscription tiers (Free, Solo, Team) for individual and collaborative work.
- Designed for fast onboarding, built-in collaboration and flexible storage
- [Pricing & Plans →](https://www.cvat.ai/pricing/cvat-online)
- Try for free: [**app.cvat.ai**](https://app.cvat.ai)

### CVAT Enterprise

- For large organisations and regulated environments.
- Includes advanced features such as SSO/LDAP, audit logs, dedicated support, and custom SLAs.
- Managed deployment options, on-premises or private cloud.
- [Pricing & Plans →](https://www.cvat.ai/pricing/enterprise)

### Labeling as a Service

- If you prefer not to build your own annotation team, we offer expert annotation services using CVAT.
- Scalable annotation across projects, with QA built-in and reporting dashboards.
- Ideal for one-time annotation projects and recurring workflows alike.

[Learn more about CVAT Labeling Services →](https://www.cvat.ai/annotation-services)

## Supported Data & Formats

CVAT supports a wide range of file formats and includes comprehensive built-in
annotation tools for various computer vision tasks.

Input:

- **Image**: All formats supported by the Python
  [**Pillow library**](https://pillow.readthedocs.io/en/stable/handbook/image-file-formats.html),
  including `JPEG`, `PNG`, `BMP`, `GIF`, `PPM`and `TIFF`
- **Video**: all formats, supported by ffmpeg, including `MP4`, `AVI`, and `MOV`
- **3D**: `.pcd`, `.bin`

For more information about dataset formats, see
{{< ilink "/docs/dataset_management/formats" "**Dataset Management**" >}}.

## Annotation Tools

CVAT provides a comprehensive suite of annotation tools for various computer vision tasks.

These tools make CVAT a versatile platform for a range of annotation needs, from basic labeling to complex
multidimensional tasks in advanced computer vision projects.

| Tool                                                                                          | Use Cases                                                                                                      |
| -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| {{< ilink "/docs/annotation/auto-annotation/ai-tools" "**AI Tools**" >}} | Automatic object detection, segmentation, and tracking powered by pre-trained (SAM/SAM2, YOLO, Hugging Face, Roboflow, etc) and fine-tuned models. |
| {{< ilink "/docs/annotation/manual-annotation/modes/attribute-annotation-mode-advanced" "**Attributes**" >}} | Useful for adding detailed information to objects, like color, size, or other specific characteristics.        |
| {{< ilink "/docs/annotation/manual-annotation/shapes/annotation-with-rectangles" "**Rectangles**" >}}        | Best for simple object detection where objects have a box-like shape, such as detecting windows in a building. |
| {{< ilink "/docs/annotation/manual-annotation/shapes/annotation-with-polygons" "**Polygons**" >}}            | Suited for complex shapes in images, like outlining geographical features in maps or detailed product shapes.  |
| {{< ilink "/docs/annotation/manual-annotation/shapes/annotation-with-polylines" "**Polylines**" >}}          | Great for annotating linear objects like roads, pathways, or limbs in pose estimation.                         |
| {{< ilink "/docs/annotation/manual-annotation/shapes/annotation-with-ellipses" "**Ellipses**" >}}            | A tool for creating segmentation masks for circular or oval objects like plates, balls, or eyes.                  |
| {{< ilink "/docs/annotation/manual-annotation/shapes/annotation-with-cuboids" "**Cuboids**" >}}              | A tool for creating 3D segmentation masks that capture object volume and position, useful for autonomous driving or robotics.      |
| {{< ilink "/docs/annotation/manual-annotation/shapes/skeletons" "**Skeletons**" >}}                          | A tool for creating segmentation masks of articulated structures, ideal for human pose estimation, animation, and movement analysis.             |
| {{< ilink "/docs/annotation/manual-annotation/shapes/annotation-with-brush-tool" "**Brush Tool**" >}}        | A tool for creating detailed, free-form segmentation masks where pixel-level precision is required, such as in medical imaging.             |
| {{< ilink "/docs/annotation/manual-annotation/shapes/annotation-with-tags" "**Tags**" >}}                    | Useful for image and video classification tasks, like identifying scenes or themes in a dataset.               |

## Automated Labeling

CVAT makes annotation workflows faster with automated and semi-automated methods, including integrations
with pre-trained models, AI agents (e.g., for tracking across frames) and external model sources.
Use AI to pre-annotate data, then refine with human oversight.

Below is a detailed table of the supported algorithms and the platforms they operate on:

| Algorithm Name                                                                                                                                      | Category   | Framework  | CPU Support | GPU Support |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------- | ----------- | ----------- |
| [Segment Anything](https://github.com/cvat-ai/cvat/tree/develop/serverless/pytorch/facebookresearch/sam/nuclio)                                     | Interactor | PyTorch    | ✔️          | ✔️          |
| [Deep Extreme Cut](https://github.com/cvat-ai/cvat/tree/develop/serverless/openvino/dextr/nuclio)                                                   | Interactor | OpenVINO   | ✔️          |             |
| [Faster RCNN](https://github.com/cvat-ai/cvat/tree/develop/serverless/openvino/omz/public/faster_rcnn_inception_resnet_v2_atrous_coco/nuclio)       | Detector   | OpenVINO   | ✔️          |             |
| [Mask RCNN](https://github.com/cvat-ai/cvat/tree/develop/serverless/openvino/omz/public/mask_rcnn_inception_resnet_v2_atrous_coco/nuclio)           | Detector   | OpenVINO   | ✔️          |             |
| [YOLO v3](https://github.com/cvat-ai/cvat/tree/develop/serverless/openvino/omz/public/yolo-v3-tf/nuclio)                                            | Detector   | OpenVINO   | ✔️          |             |
| [YOLO v7](https://github.com/cvat-ai/cvat/tree/develop/serverless/onnx/WongKinYiu/yolov7/nuclio)                                                    | Detector   | ONNX       | ✔️          | ✔️          |
| [Object Reidentification](https://github.com/cvat-ai/cvat/tree/develop/serverless/openvino/omz/intel/person-reidentification-retail-0277/nuclio)    | ReID       | OpenVINO   | ✔️          |             |
| [Semantic Segmentation for ADAS](https://github.com/cvat-ai/cvat/tree/develop/serverless/openvino/omz/intel/semantic-segmentation-adas-0001/nuclio) | Detector   | OpenVINO   | ✔️          |             |
| [Text Detection v4](https://github.com/cvat-ai/cvat/tree/develop/serverless/openvino/omz/intel/text-detection-0004/nuclio)                          | Detector   | OpenVINO   | ✔️          |             |
| [SiamMask](https://github.com/cvat-ai/cvat/tree/develop/serverless/pytorch/foolwood/siammask/nuclio)                                                | Tracker    | PyTorch    | ✔️          | ✔️          |
| [TransT](https://github.com/cvat-ai/cvat/tree/develop/serverless/pytorch/dschoerk/transt/nuclio)                                                    | Tracker    | PyTorch    | ✔️          | ✔️          |
| [Inside-Outside Guidance](https://github.com/cvat-ai/cvat/tree/develop/serverless/pytorch/shiyinzhang/iog/nuclio)                                   | Interactor | PyTorch    | ✔️          |             |
| [Faster RCNN](https://github.com/cvat-ai/cvat/tree/develop/serverless/tensorflow/faster_rcnn_inception_v2_coco/nuclio)                              | Detector   | TensorFlow | ✔️          | ✔️          |
| [RetinaNet](https://github.com/cvat-ai/cvat/tree/develop/serverless/pytorch/facebookresearch/detectron2/retinanet_r101/nuclio)                      | Detector   | PyTorch    | ✔️          | ✔️          |
| [Face Detection](https://github.com/cvat-ai/cvat/tree/develop/serverless/openvino/omz/intel/face-detection-0205/nuclio)                             | Detector   | OpenVINO   | ✔️          |             |

## How to Get Started

Start here if you're unsure where to begin with CVAT.

### CVAT Online

| Name                                                                                                    | Description                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| {{< ilink "/docs/annotation/tools" "**Annotation tools**" >}}                                           | This comprehensive guide covers all CVAT tools available for work. It includes descriptions of all available tools, quality control methods, and procedures for importing and exporting data. This manual is relevant for both CVAT Online and Self-Hosted versions. |
| {{< ilink "/docs/guides/workflow-org" "**CVAT Complete Workflow Guide for Organizations**" >}} | This guide provides a comprehensive overview of using CVAT for collaboration in organizations.                                                                                                                                                                      |
| {{< ilink "/docs/account_management/subscription-management" "**Subscription Management**" >}} | Learn how to [**choose a plan**](https://www.cvat.ai/post/cvat-ai-pricing-plans-choosing-the-right-plan-for-your-needs), subscribe, and manage your subscription effectively.                                                                                       |

### CVAT Community and Enterprise

| Name                                                                                           | Description                                                                                                                                                                                                                |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| {{< ilink "/docs/administration/basics/installation" "**Self-hosted Installation Guide**" >}}  | Start here to install self-hosted solution on your premises.                                                                                                                                                               |
| [**Dataset Management Framework**](https://github.com/cvat-ai/datumaro/blob/develop/README.md) | Specifically for the Self-Hosted version, this framework and CLI tool are essential for building, transforming, and analyzing datasets.                                                                                    |
| {{< ilink "/docs/api_sdk/api" "**Server API**" >}}                                             | The CVAT server offers a HTTP REST API for interactions. This section explains how client applications, whether they are command line tools, browsers, or scripts, interact with CVAT through HTTP requests and responses. |
| {{< ilink "/docs/api_sdk/sdk" "**Python SDK**" >}}                                             | The CVAT SDK is a Python library providing access to server interactions and additional functionalities like data validation and serialization.                                                                            |
| {{< ilink "/docs/api_sdk/cli" "**Command Line Tool**" >}}                                      | This tool offers a straightforward command line interface for managing CVAT tasks. Currently featuring basic functionalities, it has the potential to develop into a more advanced administration tool for CVAT.           |
| {{< ilink "/docs/dataset_management/formats/format-cvat#format-specifications" "**XML Annotation Format**" >}} | Detailed documentation on the XML format used for annotations in CVAT essential for understanding data structure and compatibility.                                                                                        |
| {{< ilink "/docs/administration/basics/aws-deployment-guide" "**AWS Deployment Guide**" >}}    | A step-by-step guide for deploying CVAT on Amazon Web Services, covering all necessary procedures and tips.                                                                                                                |
| {{< ilink "/docs/faq" "**Frequently Asked Questions**" >}}                                     | This section addresses common queries and provides helpful answers and insights about using CVAT.                                                                                                                          |

## Integrations

CVAT is a global tool, trusted and utilized by teams worldwide.
Below is a list of key companies that contribute significantly to our
product support or are an integral part of our ecosystem.

| Service                                                                  | Available In           | Description                                                                                                                                                                                                                                           |
| ----------------------------------------------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [**Human Protocol**](https://hmt.ai)                                                | CVAT Online, CVAT Community, CVAT Enterprise | Incorporates CVAT to augment annotation services within the Human Protocol framework, enhancing its capabilities in data labeling.                                                                                                                    |
| [**FiftyOne**](https://fiftyone.ai)                                                 | CVAT Online, CVAT Community, CVAT Enterprise | An open-source tool for dataset management and model analysis in computer vision, FiftyOne is [closely integrated](https://voxel51.com/docs/fiftyone/integrations/cvat.html) with CVAT to enhance annotation capabilities and label refinement.       |
| [**Hugging Face**](https://huggingface.co/),  [**Roboflow**](https://roboflow.com/) | CVAT Online          | In CVAT Online, models from Hugging Face and Roboflow can be added to enhance computer vision tasks. For more information, see [**Integration with Hugging Face and Roboflow**](https://www.cvat.ai/post/integrating-hugging-face-and-roboflow-models) |

## License Information

CVAT includes the following licenses:

| License Type                                           | Applicable To          | Description                                                                                                                                                                                                                                   |
| ------------------------------------------------------ | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [**MIT License**](https://opensource.org/licenses/MIT) | CVAT Community, CVAT Enterprise | This code is distributed under the MIT License, a permissive free software license that allows for broad use, modification, and distribution.                                                                                                 |
| [**LGPL License (FFmpeg)**](https://www.ffmpeg.org)    | CVAT Online, CVAT Community, CVAT Enterprise | Incorporates LGPL-licensed components from the FFmpeg project. Users should verify if their use of FFmpeg requires additional licenses. CVAT.ai Corporation does not provide these licenses and is not liable for any related licensing fees. |
| **Commercial License**                                 | CVAT Enterprise | For commercial use of the Enterprise solution of CVAT, a separate commercial license is applicable. This is tailored for businesses and commercial entities.                                                                                  |
| [**Terms of Use**](https://www.cvat.ai/terms-of-use)   | CVAT Online, CVAT Community, CVAT Enterprise | Outlines the terms of use and confidential information handling for CVAT. Important for understanding the legal framework of using the platform.                                                                                              |
| [**Privacy Policy**](https://www.cvat.ai/privacy)      | CVAT Online, CVAT Community, CVAT Enterprise | Our Privacy Policy governs your visit to <https://cvat.ai> and your use of <https://app.cvat.ai>, and explains how we collect, safeguard and disclose information that results from your use of our Service.                                  |

## Get in touch

To get in touch, use one of the following channels:

| Type of inquiry                                                                                    | Applicable to          | Description                                                                                          |
| -------------------------------------------------------------------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------- |
| [**Commercial Inquiries**](https://www.cvat.ai/sales)                             | CVAT Online, CVAT Enterprise, Labeling Services | Request a quote for CVAT Enterprise, CVAT Online Team subscription or order our labeling services. |
| [**General Inquiries**](https://www.cvat.ai/general)                                               | All products and services | Reach out to discuss partnership, co-marketing or investment opportunities with CVAT team. | |
| [**CVAT Online Customer Support**](https://youtrack.cvat.ai/form/447d9c98-ab4b-466e-bf9d-004f01b22f73) | CVAT Online (Pro and Team plans) | Chat with us about product support, resolve billing questions, or provide feedback. |
| [**CVAT Community Customer Support**](https://github.com/cvat-ai/cvat/issues) | CVAT Community    | Report a bug or submit a feature request in out GitHub repository. |
