---
title: 'CVAT Overview'
linkTitle: 'CVAT Overview'
weight: 1
description: 'The open-source tool for image and video annotation'
---

## What is CVAT

Machine learning systems are only as good as the data used for their training.
Even the most sophisticated models may underperform due to low-quality
or poorly annotated data.

To enhance a model's accuracy, you need efficient tools.

[**CVAT.ai**](https://www.cvat.ai/) **is a** versatile open‐source **platform**
for **annotating images, videos, and point clouds**.

CVAT stands for Computer Vision Annotation Tool.

CVAT serves the global computer vision community.
It empowers developers, researchers, businesses,
and organizations to use a data-centric AI approach.

CVAT provides a robust, user-friendly toolset.
Use it to generate high-quality training data
crucial for building accurate machine-learning models.

## Get started with CVAT

To get started with CVAT, follow these steps:

- [Choose your CVAT version](#cvat-versions)
- [Explore the features](#tools-and-formats):
  - [Supported formats](#supported-formats)
  - [Annotation tools](#annotation-tools)
  - [Automated labeling](#automated-labeling)
  - [Integrations](#integrations)
- [Dive into the documentation](#useful-links):
  - [Cloud](#cloud)
  - [Self-Hosted](#self-hosted)
- [Understand the licensing and policies](#license-information)
- [Get in touch with CVAT](#get-in-touch)

## CVAT versions

CVAT offers three versions to cater to your unique needs:

- [**CVAT Cloud**](https://app.cvat.ai/):
  - Start annotating with CVAT **for free** immediately in your web browser.
  - Choose a [**subscription**](https://www.cvat.ai/pricing/cloud) for **unlimited data**,
  **collaboration**, **auto-annotations**, and [**more**](https://www.cvat.ai/post/cvat-ai-pricing-plans-choosing-the-right-plan-for-your-needs).
  - Ideal for individual users and teams who need a fully managed solution.
  No installation or maintenance is needed.
- **Self-hosted CVAT Community Edition**:
  - Deploy and manage a free, open-source version on your infrastructure.
  - Follow the
  {{< ilink "/docs/administration/basics/installation" "**Self-hosted Installation Guide**" >}}
  for setup.
  - Suitable for developers, researchers, and teams requiring on-premises deployment. Offers
  full control over data, infrastructure, and open-source code under the MIT License.
- **Self-hosted CVAT Enterprise Edition**:
  - Deploy a commercially licensed version of CVAT with dedicated support and enhanced features.
  - Get [**enterprise-level support**](https://www.cvat.ai/pricing/on-prem)
  and **premium features**. These include **SSO**, **LDAP**, advanced integrations with
  [**Roboflow and HuggingFace**](https://www.cvat.ai/post/integrating-hugging-face-and-roboflow-models),
  and **advanced analytics**.
  - Benefit from **professional training** and **24-hour SLA support**.
  - Designed for organizations requiring robust support, integrations
  with enterprise systems, and advanced features.

## Formats, tools, and features

CVAT is a comprehensive tool for image, video, and point cloud annotation,
essential for various computer vision tasks.

It is user-friendly, adaptable, and compatible with many formats and tools.

### Supported formats

CVAT supports the following formats, ensuring compatibility with different datasets:

- **For 3D**: `PCD` and `BIN` to annotate the point clouds.
- **For images**: all formats supported by the Python
  [**Pillow library**](https://pillow.readthedocs.io/en/stable/handbook/image-file-formats.html),
  including `JPEG`, `PNG`, `BMP`, `GIF`, `PPM`, and `TIFF`.
- **For video**: all formats supported by FFmpeg, including `MP4`, `AVI`, and `MOV`.

For details on annotation export and import formats, see
{{< ilink "/docs/manual/advanced/formats" "**Export annotations and data from CVAT**" >}}.

### Annotation tools

CVAT offers a comprehensive annotation toolset. Each tool is tailored for specific aspects of
image, video, and point cloud labeling.

These tools make CVAT a versatile platform for a range of annotation needs, from basic labeling
to complex, multidimensional tasks in advanced computer vision projects:

<!--lint disable maximum-line-length-->

| Annotation Tool                                                                                          | Use Cases                                                                                                      |
| -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| {{< ilink "/docs/manual/advanced/3d-object-annotation-advanced" "**3D Object Annotation**" >}}           | Ideal for projects that require depth perception and volume estimation, like autonomous vehicle training.      |
| {{< ilink "/docs/manual/advanced/attribute-annotation-mode-advanced" "**Attribute Annotation Mode**" >}} | Useful for adding detailed information to objects, like color, size, or other specific characteristics.        |
| {{< ilink "/docs/manual/advanced/annotation-with-rectangles" "**Annotation with Rectangles**" >}}        | Best for simple object detection where objects have a box-like shape, such as detecting windows in a building. |
| {{< ilink "/docs/manual/advanced/annotation-with-polygons" "**Annotation with Polygons**" >}}            | Suited for complex shapes in images, like outlining geographical features in maps or detailed product shapes.  |
| {{< ilink "/docs/manual/advanced/annotation-with-polylines" "**Annotation with Polylines**" >}}          | Great for annotating linear objects like roads, pathways, or limbs in pose estimation.                         |
| {{< ilink "/docs/manual/advanced/annotation-with-ellipses" "**Annotation with Ellipses**" >}}            | Ideal for objects like plates, balls, or eyes, where a circular or oval annotation is needed.                  |
| {{< ilink "/docs/manual/advanced/annotation-with-cuboids" "**Annotation with Cuboids**" >}}              | Useful for 3D objects in 2D images, like boxes or furniture in room layouts.                                   |
| {{< ilink "/docs/manual/advanced/skeletons" "**Annotation with Skeletons**" >}}                          | Ideal for human pose estimation, animation, and movement analysis in sports or medical fields.                 |
| {{< ilink "/docs/manual/advanced/annotation-with-brush-tool" "**Annotation with Brush Tool**" >}}        | Perfect for intricate and detailed annotations where precision is key, such as in medical imaging.             |
| {{< ilink "/docs/manual/advanced/annotation-with-tags" "**Annotation with Tags**" >}}                    | Useful for image and video classification tasks, like identifying scenes or themes in a dataset.               |

<!--lint enable maximum-line-length-->

### Automated labeling

CVAT offers automated labeling features, greatly enhancing the annotation process and
potentially speeding it up by up to 10 times.

> **Note:**
> For more information,
> see {{< ilink "/docs/manual/advanced/ai-tools" "**OpenCV and AI Tools**" >}}

Below is a detailed table of the supported algorithms and the platforms they operate on:

<!--lint disable maximum-line-length-->

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
| [f-BRS](https://github.com/cvat-ai/cvat/tree/develop/serverless/pytorch/saic-vul/fbrs/nuclio)                                                       | Interactor | PyTorch    | ✔️          |             |
| [HRNet](https://github.com/cvat-ai/cvat/tree/develop/serverless/pytorch/saic-vul/hrnet/nuclio)                                                      | Interactor | PyTorch    |             | ✔️          |
| [Inside-Outside Guidance](https://github.com/cvat-ai/cvat/tree/develop/serverless/pytorch/shiyinzhang/iog/nuclio)                                   | Interactor | PyTorch    | ✔️          |             |
| [Faster RCNN](https://github.com/cvat-ai/cvat/tree/develop/serverless/tensorflow/faster_rcnn_inception_v2_coco/nuclio)                              | Detector   | TensorFlow | ✔️          | ✔️          |
| [RetinaNet](https://github.com/cvat-ai/cvat/tree/develop/serverless/pytorch/facebookresearch/detectron2/retinanet_r101/nuclio)                      | Detector   | PyTorch    | ✔️          | ✔️          |
| [Face Detection](https://github.com/cvat-ai/cvat/tree/develop/serverless/openvino/omz/intel/face-detection-0205/nuclio)                             | Detector   | OpenVINO   | ✔️          |             |

<!--lint enable maximum-line-length-->

### Integrations

CVAT is a global tool trusted and utilized by teams worldwide.

Below is a list of key companies that contribute significantly to our
product support or are an integral part of our ecosystem.

CVAT integrates with their tools to streamline your workflow.

<!--lint disable maximum-line-length-->

| Integrated Service                                                                  | Available In          | Description                                                                                                                                                                                                                                          |
| ----------------------------------------------------------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [**Human Protocol**](https://hmt.ai)                                                | Cloud and Self-hosted | Incorporates CVAT to augment annotation services within the Human Protocol framework, enhancing its capabilities in data labeling.                                                                                                                   |
| [**FiftyOne**](https://fiftyone.ai)                                                 | Cloud and Self-hosted | An open-source tool for dataset management and model analysis in computer vision, FiftyOne is [closely integrated](https://voxel51.com/docs/fiftyone/integrations/cvat.html) with CVAT to enhance annotation capabilities and label refinement.      |
| [**Hugging Face**](https://huggingface.co/) & [**Roboflow**](https://roboflow.com/) | Cloud                 | In CVAT Cloud, you can add models from Hugging Face and Roboflow to enhance computer vision tasks. For more information, see [**Integration with Hugging Face and Roboflow**](https://www.cvat.ai/post/integrating-hugging-face-and-roboflow-models) |

<!--lint enable maximum-line-length-->

## Useful resources

Start here if you're unsure where to begin with CVAT.
Or read the docs to dive deeper into CVAT's extensive feature set and unleash its full potential.

<!--lint disable maximum-line-length-->

### Cloud

| Name                                                                                                    | Description                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| {{< ilink "/docs/manual" "**User Manual**" >}}                                                          | Familiarize yourself with the CVAT toolbox and features from this comprehensive guide. Learn about all the available tools, quality control methods, and data import/export procedures. The manual is applicable for both CVAT Cloud and Self-Hosted versions. |
| {{< ilink "/docs/getting_started/workflow-org" "**CVAT Complete Workflow Guide for Organizations**" >}} | Discover how to use CVAT for collaborative annotation projects within organizations.                                                                                                                                                |
| {{< ilink "/docs/enterprise/subscription-management" "**Subscription Management**" >}}                  | Understand how to [**choose a plan**](https://www.cvat.ai/post/cvat-ai-pricing-plans-choosing-the-right-plan-for-your-needs), subscribe, and manage your subscription effectively.                                                  |
| {{< ilink "/docs/manual/advanced/xml_format" "**XML Annotation Format**" >}}                            | Delve into the details of the XML format used for annotations in CVAT. This guide is essential for understanding the data structure and compatibility.                                                                                  |

### Self-Hosted

| Name                                                                                           | Description                                                                                                                                                                                                                         |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| {{< ilink "/docs/administration/basics/installation" "**Self-hosted Installation Guide**" >}}  | Start here to install a self-hosted solution on your premises.                                                                                                                                                                        |
| [**Dataset Management Framework**](https://github.com/cvat-ai/datumaro/blob/develop/README.md) | Specifically for self-hosted deployments, learn how to use the essential framework and CLI tool for building, transforming, and analyzing datasets.                                                                             |
| {{< ilink "/docs/api_sdk/api" "**Server API**" >}}                                             | Learn how to interact with the CVAT server via the HTTP REST API. This section explains how client applications, whether they are command-line tools, browsers, or scripts, interact with CVAT through HTTP requests and responses. |
| {{< ilink "/docs/api_sdk/sdk" "**Python SDK**" >}}                                             | Discover the CVAT SDK, a Python library providing access to server interactions and additional functionalities like data validation and serialization.                                                                              |
| {{< ilink "/docs/api_sdk/cli" "**Command Line Tool**" >}}                                      | Learn how to use this straightforward command-line interface for managing CVAT tasks. Currently featuring basic features, it might develop into a more advanced administration tool for CVAT.                    |
| {{< ilink "/docs/manual/advanced/xml_format" "**XML Annotation Format**" >}}                   | Delve into the details of the XML format used for annotations in CVAT. This guide is essential for understanding data structure and compatibility.                                                                                  |
| {{< ilink "/docs/administration/basics/aws-deployment-guide" "**AWS Deployment Guide**" >}}    | Follow this step-by-step guide to deploy CVAT on Amazon Web Services. It covers all necessary procedures and tips.                                                                                                                  |
| {{< ilink "/docs/faq" "**Frequently Asked Questions**" >}}                                     | Find answers to common user queries and gain valuable insights about using CVAT efficiently.                                                                                                                                        |

<!--lint enable maximum-line-length-->

## License Information

CVAT includes the following licenses:

<!--lint disable maximum-line-length-->

| License Type                                           | Applicable To          | Description                                                                                                                                                                                                                                   |
| ------------------------------------------------------ | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [**MIT License**](https://opensource.org/licenses/MIT) | Self-hosted            | This code is distributed under the MIT License, a permissive free software license that allows for broad use, modification, and distribution.                                                                                                 |
| [**LGPL License (FFmpeg)**](https://www.ffmpeg.org)    | Cloud and Self-hosted  | Incorporates LGPL-licensed components from the FFmpeg project. Users should verify if their use of FFmpeg requires additional licenses. CVAT.ai Corporation does not provide these licenses and is not liable for any related licensing fees. |
| **Commercial License**                                 | Self-hosted Enterprise | For commercial use of the CVAT's Enterprise solution, a separate commercial license is applicable. It is tailored for businesses and commercial entities.                                                                                  |
| [**Terms of Use**](https://www.cvat.ai/terms-of-use)   | Cloud and Self-hosted  | Explains the CVAT's terms of use and confidential information handling. Read carefully to understand the legal framework of using the platform.                                                                                                 |
| [**Privacy Policy**](https://www.cvat.ai/privacy)      | Cloud                  | Governs your visits to <https://cvat.ai> and your use of <https://app.cvat.ai>, and explains how we collect, safeguard, and disclose information that results from your use of our Services.                                                   |

<!--lint enable maximum-line-length-->

## Get in touch

Connect with the CVAT team and community through the following channels:

> **Note:** If you're using CVAT, we'd love to
> hear from you at [contact@cvat.ai](mailto:contact+github@cvat.ai).

<!--lint disable maximum-line-length-->

| Support Channel                                                                                    | Applicable To         | Description                                                                         |
| -------------------------------------------------------------------------------------------------- | --------------------- | ----------------------------------------------------------------------------------- |
| [**Discord Channel**](https://discord.gg/S6sRHhuQ7K)                                               | Cloud and Self-hosted | Join for discussions, questions, and all things CVAT.                               |
| [**LinkedIn**](https://www.linkedin.com/company/cvat-ai/)                                          | Cloud and Self-hosted | Follow for company updates, news, and employment opportunities.                     |
| [**YouTube Channel**](https://www.youtube.com/@cvat-ai)                                            | Cloud and Self-hosted | Find tutorials and screencasts about CVAT tools.                                    |
| [**GitHub Issues**](https://github.com/cvat-ai/cvat/issues)                                        | Cloud and Self-hosted | Report bugs or contribute to CVAT development.                                      |
| [**Customer Support Channel**](https://youtrack.cvat.ai/form/447d9c98-ab4b-466e-bf9d-004f01b22f73) | Cloud (Paid Users)    | Exclusive support for CVAT Cloud paid users.                                        |
| [**Commercial Support Inquiries**](mailto:contact+github@cvat.ai)                                                                   | Cloud and Self-hosted | For commercial support, email [**contact@cvat.ai**](mailto:contact+github@cvat.ai). |

<!--lint enable maximum-line-length-->
