---
title: 'CVAT Overview'
linkTitle: 'CVAT Overview'
weight: 1
description:
---

CVAT is an enterprise-grade platform for managing high-quality visual datasets for computer vision applications. It offers advanced tools for image, video, and 3D annotation, built-in quality assurance (QA), automation, and secure team collaboration.

Backed by an active open-source community with over 14,500 GitHub stars and trusted by hundreds of organizations worldwide, CVAT helps organizations streamline data labeling for faster, more accurate model development.

CVAT comes in three editions: CVAT Community, CVAT Online, and CVAT Enterprise.

- [CVAT Community](https://github.com/cvat-ai/cvat) is the free, self-hosted version with core functionality.
- [CVAT Online](https://app.cvat.ai) is the SaaS edition with three pricing tiers (Free, Solo, Team).
- [CVAT Enterprise](https://www.cvat.ai/pricing/enterprise) is a self-hosted, premium version with enhanced security.

## Tools and formats

CVAT stands as a comprehensive tool for image and video annotation,
essential for various computer vision tasks.

It emphasizes user-friendliness, adaptability, and compatibility with
a range of formats and tools.

### Supported formats

CVAT's supports the following formats:

- **3D**: `.pcd`, `.bin`
- **Image**: everything supported by the Python
  [**Pillow library**](https://pillow.readthedocs.io/en/stable/handbook/image-file-formats.html),
  including formats like `JPEG`, `PNG`, `BMP`, `GIF`, `PPM`and `TIFF`.
- **Video**: all formats, supported by ffmpeg, including `MP4`, `AVI`, and `MOV`.

For annotation export and import formats, see
{{< ilink "/docs/dataset_management/formats" "**Export annotations and data from CVAT**" >}}

### Annotation tools

CVAT offers a wide range of annotation tools, each catering to different aspects of
image and video labeling:

<!--lint disable maximum-line-length-->

| Annotation Tool                                                                                          | Use Cases                                                                                                      |
| -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| {{< ilink "/docs/annotation/tools/3d-object-annotation-advanced" "**3D Object Annotation**" >}}           | Ideal for projects that require depth perception and volume estimation, like autonomous vehicle training.      |
| {{< ilink "/docs/annotation/tools/attribute-annotation-mode-advanced" "**Attribute Annotation Mode**" >}} | Useful for adding detailed information to objects, like color, size, or other specific characteristics.        |
| {{< ilink "/docs/annotation/tools/annotation-with-rectangles" "**Annotation with Rectangles**" >}}        | Best for simple object detection where objects have a box-like shape, such as detecting windows in a building. |
| {{< ilink "/docs/annotation/tools/annotation-with-polygons" "**Annotation with Polygons**" >}}            | Suited for complex shapes in images, like outlining geographical features in maps or detailed product shapes.  |
| {{< ilink "/docs/annotation/tools/annotation-with-polylines" "**Annotation with Polylines**" >}}          | Great for annotating linear objects like roads, pathways, or limbs in pose estimation.                         |
| {{< ilink "/docs/annotation/tools/annotation-with-ellipses" "**Annotation with Ellipses**" >}}            | Ideal for objects like plates, balls, or eyes, where a circular or oval annotation is needed.                  |
| {{< ilink "/docs/annotation/tools/annotation-with-cuboids" "**Annotation with Cuboids**" >}}              | Useful for 3D objects in 2D images, like boxes or furniture in room layouts.                                   |
| {{< ilink "/docs/annotation/tools/skeletons" "**Annotation with Skeletons**" >}}                          | Ideal for human pose estimation, animation, and movement analysis in sports or medical fields.                 |
| {{< ilink "/docs/annotation/tools/annotation-with-brush-tool" "**Annotation with Brush Tool**" >}}        | Perfect for intricate and detailed annotations where precision is key, such as in medical imaging.             |
| {{< ilink "/docs/annotation/tools/annotation-with-tags" "**Annotation with Tags**" >}}                    | Useful for image and video classification tasks, like identifying scenes or themes in a dataset.               |

<!--lint enable maximum-line-length-->

These tools make CVAT a versatile platform for a range of annotation
needs, from basic labeling to complex, multidimensional
tasks in advanced computer vision projects.

## Automated labeling

CVAT has an automated labeling features, enhancing the annotation process significantly,
potentially speeding it up by up to 10 times.

{{% alert title="Note" color="primary" %}}
For more information,
see {{< ilink "/docs/annotation/tools/ai-tools" "**OpenCV and AI Tools**" >}}
{{% /alert %}}

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
| [Inside-Outside Guidance](https://github.com/cvat-ai/cvat/tree/develop/serverless/pytorch/shiyinzhang/iog/nuclio)                                   | Interactor | PyTorch    | ✔️          |             |
| [Faster RCNN](https://github.com/cvat-ai/cvat/tree/develop/serverless/tensorflow/faster_rcnn_inception_v2_coco/nuclio)                              | Detector   | TensorFlow | ✔️          | ✔️          |
| [RetinaNet](https://github.com/cvat-ai/cvat/tree/develop/serverless/pytorch/facebookresearch/detectron2/retinanet_r101/nuclio)                      | Detector   | PyTorch    | ✔️          | ✔️          |
| [Face Detection](https://github.com/cvat-ai/cvat/tree/develop/serverless/openvino/omz/intel/face-detection-0205/nuclio)                             | Detector   | OpenVINO   | ✔️          |             |

<!--lint enable maximum-line-length-->

## Useful links

Start here if you're unsure where to begin with CVAT.

<!--lint disable maximum-line-length-->

### CVAT Online

| Name                                                                                                    | Description                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| {{< ilink "/docs/annotation/tools" "**Annotation tools**" >}}                                                          | This comprehensive guide covers all CVAT tools available for work. It includes descriptions of all available tools, quality control methods, and procedures for importing and exporting data. This manual is relevant for both CVAT Online and Self-Hosted versions. |
| {{< ilink "/docs/guides/workflow-org" "**CVAT Complete Workflow Guide for Organizations**" >}} | This guide provides a comprehensive overview of using CVAT for collaboration in organizations.                                                                                                                                                                      |
| {{< ilink "/docs/account_management/subscription-management" "**Subscription Management**" >}}                  | Learn how to [**choose a plan**](https://www.cvat.ai/post/cvat-ai-pricing-plans-choosing-the-right-plan-for-your-needs), subscribe, and manage your subscription effectively.                                                                                       |
| {{< ilink "/docs/other/xml_format" "**XML Annotation Format**" >}}                            | Detailed documentation on the XML format used for annotations in CVAT essential for understanding data structure and compatibility.                                                                                                                                 |

### CVAT Community and Enterprise

| Name                                                                                           | Description                                                                                                                                                                                                                |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| {{< ilink "/docs/administration/basics/installation" "**Self-hosted Installation Guide**" >}}  | Start here to install self-hosted solution on your premises.                                                                                                                                                               |
| [**Dataset Management Framework**](https://github.com/cvat-ai/datumaro/blob/develop/README.md) | Specifically for the Self-Hosted version, this framework and CLI tool are essential for building, transforming, and analyzing datasets.                                                                                    |
| {{< ilink "/docs/api_sdk/api" "**Server API**" >}}                                             | The CVAT server offers a HTTP REST API for interactions. This section explains how client applications, whether they are command line tools, browsers, or scripts, interact with CVAT through HTTP requests and responses. |
| {{< ilink "/docs/api_sdk/sdk" "**Python SDK**" >}}                                             | The CVAT SDK is a Python library providing access to server interactions and additional functionalities like data validation and serialization.                                                                            |
| {{< ilink "/docs/api_sdk/cli" "**Command Line Tool**" >}}                                      | This tool offers a straightforward command line interface for managing CVAT tasks. Currently featuring basic functionalities, it has the potential to develop into a more advanced administration tool for CVAT.           |
| {{< ilink "/docs/other/xml_format" "**XML Annotation Format**" >}}                   | Detailed documentation on the XML format used for annotations in CVAT essential for understanding data structure and compatibility.                                                                                        |
| {{< ilink "/docs/administration/basics/aws-deployment-guide" "**AWS Deployment Guide**" >}}    | A step-by-step guide for deploying CVAT on Amazon Web Services, covering all necessary procedures and tips.                                                                                                                |
| {{< ilink "/docs/faq" "**Frequently Asked Questions**" >}}                                     | This section addresses common queries and provides helpful answers and insights about using CVAT.                                                                                                                          |

<!--lint enable maximum-line-length-->

## Integrations

CVAT is a global tool, trusted and utilized by teams worldwide.
Below is a list of key companies that contribute significantly to our
product support or are an integral part of our ecosystem.

{{% alert title="Note" color="primary" %}}
If you want to integrate CVAT with other MLOps tools, we'd love to
hear from you at [contact@cvat.ai](mailto:contact+github@cvat.ai).
{{% /alert %}}

<!--lint disable maximum-line-length-->

| Integrated Service                                                                  | Available In           | Description                                                                                                                                                                                                                                           |
| ----------------------------------------------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [**Human Protocol**](https://hmt.ai)                                                | Online and Self-hosted | Incorporates CVAT to augment annotation services within the Human Protocol framework, enhancing its capabilities in data labeling.                                                                                                                    |
| [**FiftyOne**](https://fiftyone.ai)                                                 | Online and Self-hosted | An open-source tool for dataset management and model analysis in computer vision, FiftyOne is [closely integrated](https://voxel51.com/docs/fiftyone/integrations/cvat.html) with CVAT to enhance annotation capabilities and label refinement.       |
| [**Hugging Face**](https://huggingface.co/) & [**Roboflow**](https://roboflow.com/) | Online                 | In CVAT Online, models from Hugging Face and Roboflow can be added to enhance computer vision tasks. For more information, see [**Integration with Hugging Face and Roboflow**](https://www.cvat.ai/post/integrating-hugging-face-and-roboflow-models) |

<!--lint enable maximum-line-length-->

## License Information

CVAT includes the following licenses:

<!--lint disable maximum-line-length-->

| License Type                                           | Applicable To          | Description                                                                                                                                                                                                                                   |
| ------------------------------------------------------ | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [**MIT License**](https://opensource.org/licenses/MIT) | Self-hosted            | This code is distributed under the MIT License, a permissive free software license that allows for broad use, modification, and distribution.                                                                                                 |
| [**LGPL License (FFmpeg)**](https://www.ffmpeg.org)    | Online and Self-hosted | Incorporates LGPL-licensed components from the FFmpeg project. Users should verify if their use of FFmpeg requires additional licenses. CVAT.ai Corporation does not provide these licenses and is not liable for any related licensing fees. |
| **Commercial License**                                 | Self-hosted Enterprise | For commercial use of the Enterprise solution of CVAT, a separate commercial license is applicable. This is tailored for businesses and commercial entities.                                                                                  |
| [**Terms of Use**](https://www.cvat.ai/terms-of-use)   | Online and Self-hosted | Outlines the terms of use and confidential information handling for CVAT. Important for understanding the legal framework of using the platform.                                                                                              |
| [**Privacy Policy**](https://www.cvat.ai/privacy)      | Online                 | Our Privacy Policy governs your visit to <https://cvat.ai> and your use of <https://app.cvat.ai>, and explains how we collect, safeguard and disclose information that results from your use of our Service.                                  |

<!--lint enable maximum-line-length-->

## Get in touch

To get in touch, use one of the following channels:

<!--lint disable maximum-line-length-->

| Type of inquiry                                                                                    | Applicable to          | Description                                                                                          |
| -------------------------------------------------------------------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------- |
| [**Commercial Inquiries**](https://www.cvat.ai/sales)                             | CVAT Online, CVAT Enterprise, Labeling Services | Request a quote for CVAT Enterprise, CVAT Online Team subscription or order our labeling services. |
| [**General Inquiries**](https://www.cvat.ai/general)                                               | All products and services | Reach out to discuss partnership, co-marketing or investment opportunities with CVAT team. |                                                     |
| [**CVAT Online Customer Support**](https://youtrack.cvat.ai/form/447d9c98-ab4b-466e-bf9d-004f01b22f73)                                        | CVAT Online (Pro and Team plans) | Chat with us about product support, resolve billing questions, or provide feedback.                                        |
| [**CVAT Community Customer Support**](https://github.com/cvat-ai/cvat/issues) | CVAT Community    | Report a bug or submit a feature request in out GitHub repository.                                                        |

<!--lint enable maximum-line-length-->
