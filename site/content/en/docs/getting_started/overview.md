---
title: 'CVAT Overview'
linkTitle: 'Introduction to CVAT'
weight: 1
description: 'CVAT: The open-source tool for image and video annotation and data labeling'
---

Machine learning systems often struggle due to
poor-quality data. Without effective tools,
improving a model can be tough and inefficient.

[**CVAT.ai**](https://www.cvat.ai/) **is a** versatile **tool** for
**annotating images and videos**, serving the computer
vision community worldwide.

Our goal is to help developers, businesses,
and organizations globally by using a Data-centric AI approach.

CVAT offers two versions:

- [**CVAT Cloud**](https://app.cvat.ai/): Start online with CVAT,
  **available for free**. You can also choose a [**subscription**](https://www.cvat.ai/pricing/cloud)
  for **unlimited data**, **organizational tools**, **auto-annotations**, and [**more**](https://www.cvat.ai/post/cvat-ai-pricing-plans-choosing-the-right-plan-for-your-needs).

- **Self-hosted CVAT** (forever Free of charge): Follow the [**Self-hosted Installation Guide**](/docs/administration/basics/installation/)
  for setup. We provide [**Enterprise-level support**](https://www.cvat.ai/pricing/on-prem)
  for this version, **including premium features** like **SSO**, **LDAP**, advanced integrations with
  [**Roboflow and HuggingFace**](https://www.cvat.ai/post/integrating-hugging-face-and-roboflow-models),
  and **advanced analytics**. We also offer **professional training** and **24-hour SLA support**.


See:

- [Tools and formats](#tools-and-formats)
  - [Supported formats](#supported-formats)
  - [Annotation tools](#annotation-tools)
- [Automated labeling](#automated-labeling)
- [Useful links](#useful-links)
- [Integrations](#integrations)
- [License Information](#license-information)
- [Get in touch](#get-in-touch)

## Tools and formats

CVAT stands as a comprehensive
tool for image and video annotation,
essential for various computer vision tasks.
It emphasizes user-friendliness,
adaptability, and compatibility with a range of formats and tools.

### Supported formats

CVAT's supports the following formats:

- **For 3D**: `.pcd`, `.bin`
- **For image**: everything supported by the Python Pillow library,
  including formats like `JPEG`, `PNG`, `BMP`, `GIG`, `PPM`and `TIFF`.
- **For video**: all formats, supported by ffmpeg, including `MP4`, `AVI`, and `MOV`.

For annotation export and import formats, see
[**Export annotations and data from CVAT**](/docs/manual/advanced/formats/)

### Annotation tools

CVAT offers a wide array of annotation tools,
each catering to different aspects of image and video labeling:

- **3D Object Annotation**: For annotating objects in three dimensions,
  providing a comprehensive perspective.
- **Attribute Annotation Mode**: Allows adding specific
  attributes to annotations.
- **Annotation with Rectangles**: Ideal for straightforward
  object detection tasks.
- **Annotation with Polygons**: Perfect for detailed
  segmentation of irregular shapes.
- **Annotation with Polylines**: Useful for tracing
  elongated shapes or paths.
- **Annotation with Ellipses**: Suitable for objects
  with elliptical shapes.
- **Annotation with Cuboids**: For 3D representation
  of objects in two dimensions.
- **Annotation with Skeletons**: Useful in pose estimation and
  tracking of articulated objects.
- **Annotation with Brush Tool**: Allows freehand drawing for
  detailed and complex annotations.
- **Annotation with Tags**: Tagging images or video frames for
  classification or categorization.

These tools make CVAT a versatile platform for a range of annotation
needs, from basic labeling to complex, multidimensional
tasks in advanced computer vision projects.

## Automated labeling

CVAT has an automated labeling features,
enhancing the annotation process significantly,
potentially speeding it up by up to 10 times.

> **Note:**
> For more information,
> see [**OpenCV and AI Tools**](/docs/manual/advanced/ai-tools/)

Below is a detailed table of the supported algorithms and the platforms they operate on:

<!--lint disable maximum-line-length-->

| Algorithm Name                                                                                          | Category   | Framework  | CPU Support | GPU Support |
| ------------------------------------------------------------------------------------------------------- | ---------- | ---------- | ----------- | ----------- |
| [Segment Anything](/serverless/pytorch/facebookresearch/sam/nuclio/)                                    | Interactor | PyTorch    | ✔️          | ✔️          |
| [Deep Extreme Cut](/serverless/openvino/dextr/nuclio)                                                   | Interactor | OpenVINO   | ✔️          |             |
| [Faster RCNN](/serverless/openvino/omz/public/faster_rcnn_inception_resnet_v2_atrous_coco/nuclio)       | Detector   | OpenVINO   | ✔️          |             |
| [Mask RCNN](/serverless/openvino/omz/public/mask_rcnn_inception_resnet_v2_atrous_coco/nuclio)           | Detector   | OpenVINO   | ✔️          |             |
| [YOLO v3](/serverless/openvino/omz/public/yolo-v3-tf/nuclio)                                            | Detector   | OpenVINO   | ✔️          |             |
| [YOLO v7](/serverless/onnx/WongKinYiu/yolov7/nuclio)                                                    | Detector   | ONNX       | ✔️          | ✔️          |
| [Object Reidentification](/serverless/openvino/omz/intel/person-reidentification-retail-0277/nuclio)    | ReID       | OpenVINO   | ✔️          |             |
| [Semantic Segmentation for ADAS](/serverless/openvino/omz/intel/semantic-segmentation-adas-0001/nuclio) | Detector   | OpenVINO   | ✔️          |             |
| [Text Detection v4](/serverless/openvino/omz/intel/text-detection-0004/nuclio)                          | Detector   | OpenVINO   | ✔️          |             |
| [SiamMask](/serverless/pytorch/foolwood/siammask/nuclio)                                                | Tracker    | PyTorch    | ✔️          | ✔️          |
| [TransT](/serverless/pytorch/dschoerk/transt/nuclio)                                                    | Tracker    | PyTorch    | ✔️          | ✔️          |
| [f-BRS](/serverless/pytorch/saic-vul/fbrs/nuclio)                                                       | Interactor | PyTorch    | ✔️          |             |
| [HRNet](/serverless/pytorch/saic-vul/hrnet/nuclio)                                                      | Interactor | PyTorch    |             | ✔️          |
| [Inside-Outside Guidance](/serverless/pytorch/shiyinzhang/iog/nuclio)                                   | Interactor | PyTorch    | ✔️          |             |
| [Faster RCNN](/serverless/tensorflow/faster_rcnn_inception_v2_coco/nuclio)                              | Detector   | TensorFlow | ✔️          | ✔️          |
| [Mask RCNN](/serverless/tensorflow/matterport/mask_rcnn/nuclio)                                         | Detector   | TensorFlow | ✔️          | ✔️          |
| [RetinaNet](serverless/pytorch/facebookresearch/detectron2/retinanet_r101/nuclio)                       | Detector   | PyTorch    | ✔️          | ✔️          |
| [Face Detection](/serverless/openvino/omz/intel/face-detection-0205/nuclio)                             | Detector   | OpenVINO   | ✔️          |             |

<!--lint enable maximum-line-length-->

## Useful links

Start here if you're unsure where to begin with CVAT.

<!--lint disable maximum-line-length-->

| Name                                                                                           | Type                  | Description                                                                                                                                                                                                                                                         |
| ---------------------------------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [**User Manual**](/docs/manual/)                                                               | Cloud and Self-hosted | This comprehensive guide covers all CVAT tools available for work. It includes descriptions of all available tools, quality control methods, and procedures for importing and exporting data. This manual is relevant for both CVAT Cloud and Self-Hosted versions. |
| [**CVAT Complete Workflow Guide for Organizations**](/docs/getting_started/workflow-org/)      | Cloud                 | This guide provides a comprehensive overview of using CVAT for collaboration in organizations.                                                                                                                                                                      |
| [**Subscription Management**](/docs/enterprise/subscription-managment/)                        | Cloud                 | Learn how to [**choose a plan**](https://www.cvat.ai/post/cvat-ai-pricing-plans-choosing-the-right-plan-for-your-needs), subscribe, and manage your subscription effectively.                                                                                       |
| [**Contributing**](https://opencv.github.io/cvat/docs/contributing/)                           | -                     | This section details how you can contribute to CVAT, helping to enhance and improve the platform.                                                                                                                                                                   |
| [**Dataset Management Framework**](https://github.com/cvat-ai/datumaro/blob/develop/README.md) | Self-Hosted           | Specifically for the Self-Hosted version, this framework and CLI tool are essential for building, transforming, and analyzing datasets.                                                                                                                             |
| [**Server API**](/docs/api_sdk/api/)                                                           | Self-Hosted           | The CVAT server offers a HTTP REST API for interactions. This section explains how client applications, whether they are command line tools, browsers, or scripts, interact with CVAT through HTTP requests and responses.                                          |
| [**Python SDK**](/docs/api_sdk/sdk/)                                                           | Self-hosted           | The CVAT SDK is a Python library providing access to server interactions and additional functionalities like data validation and serialization.                                                                                                                     |
| [**Command Line Tool**](/docs/api_sdk/cli/)                                                    | Self-hosted           | This tool offers a straightforward command line interface for managing CVAT tasks. Currently featuring basic functionalities, it has the potential to develop into a more advanced administration tool for CVAT.                                                    |
| [**XML Annotation Format**](/docs/manual/advanced/xml_format/)                                 | Cloud and Self-hosted | Detailed documentation on the XML format used for annotations in CVAT essential for understanding data structure and compatibility.                                                                                                                                 |
| [**AWS Deployment Guide**](/docs/administration/basics/aws-deployment-guide/)                  | Self-hosted           | A step-by-step guide for deploying CVAT on Amazon Web Services, covering all necessary procedures and tips.                                                                                                                                                         |
| [**Frequently Asked Questions**](/cvat/docs/faq/)                                              | Cloud and Self-hosted | This section addresses common queries and provides helpful answers and insights about using CVAT.                                                                                                                                                                   |

<!--lint enable maximum-line-length-->

## Integrations

CVAT is a global tool, trusted and utilized by teams worldwide.
Below is a list of key companies that contribute significantly to our
product support or are an integral part of our ecosystem.

> **Note:** If you're using CVAT, we'd love to
> hear from you at [contact@cvat.ai](mailto:contact+github@cvat.ai).

- [**Human Protocol**](https://hmt.ai): This platform incorporates CVAT
  for augmenting its annotation services within the Human Protocol framework.
- [**FiftyOne**](https://fiftyone.ai): As an open-source tool for dataset
  management and model analysis in computer vision,
  FiftyOne is [closely integrated](https://voxel51.com/docs/fiftyone/integrations/cvat.html)
  with CVAT, enhancing annotation capabilities and label refinement.
- [**Toloka**](https://toloka.ai): Toloka leverages CVAT for its crowdsourced data labeling
  and annotation services, enriching its
  diverse task handling capabilities. For mre information, see [**Integration with Toloka**](/docs/integration/toloka/)

## License Information

This code is distributed under the [**MIT License**](https://opensource.org/licenses/MIT),
a permissive free software license.

Additionally, this software incorporates LGPL-licensed components from
the [**FFmpeg**](https://www.ffmpeg.org) project.
For more details, visit [**FFMPEG Legal**](https://www.ffmpeg.org/legal.html).
Users must independently verify whether their use of FFmpeg necessitates
additional licenses.
CVAT.ai Corporation does not provide these licenses
and is not liable for any related licensing fees incurred through the use of FFmpeg.

For terms of use and confidential information handling,
see [**Terms of Use**](https://www.cvat.ai/terms-of-use).

## Get in touch

> **Note:** For **commercial support
> inquiries**, please email us directly at [**contact@cvat.ai**](mailto:contact+github@cvat.ai).

- [**Gitter community**](https://gitter.im/opencv-cvat/public): For questions about using CVAT.
  This platform is actively monitored by our core team and the broader community,
  ensuring quick responses to questions. You can also find answers to frequently asked questions here.

- [**Discord channel**](https://discord.gg/S6sRHhuQ7K). For broader
  discussions and questions, head over to our. This is a space for all things related to CVAT.
- [**LinkedIn**](https://www.linkedin.com/company/cvat-ai/): For company updates and employment opportunities.

- [**YouTube channel**](https://www.youtube.com/@cvat-ai): For tutorials and screencasts about CVAT tools.

- [**GitHub issues**](https://github.com/cvat-ai/cvat/issues): To report bugs.
