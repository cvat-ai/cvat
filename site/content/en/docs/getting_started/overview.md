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
  - [Cloud](#cloud)
  - [Self-Hosted](#self-hosted)
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
- **For image**: everything supported by the Python
  [**Pillow library**](https://pillow.readthedocs.io/en/stable/handbook/image-file-formats.html),
  including formats like `JPEG`, `PNG`, `BMP`, `GIG`, `PPM`and `TIFF`.
- **For video**: all formats, supported by ffmpeg, including `MP4`, `AVI`, and `MOV`.

For annotation export and import formats, see
[**Export annotations and data from CVAT**](/docs/manual/advanced/formats/)

### Annotation tools

CVAT offers a wide array of annotation tools,
each catering to different aspects of image and video labeling:

<!--lint disable maximum-line-length-->

| Annotation Tool                                                                            | Use Cases                                                                                                      |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| [**3D Object Annotation**](/docs/manual/advanced/3d-object-annotation-advanced/)           | Ideal for projects that require depth perception and volume estimation, like autonomous vehicle training.      |
| [**Attribute Annotation Mode**](/docs/manual/advanced/attribute-annotation-mode-advanced/) | Useful for adding detailed information to objects, like color, size, or other specific characteristics.        |
| [**Annotation with Rectangles**](/docs/manual/advanced/annotation-with-rectangles/)        | Best for simple object detection where objects have a box-like shape, such as detecting windows in a building. |
| [**Annotation with Polygons**](/docs/manual/advanced/annotation-with-polygons/)            | Suited for complex shapes in images, like outlining geographical features in maps or detailed product shapes.  |
| [**Annotation with Polylines**](docs/manual/advanced/annotation-with-polylines/)           | Great for annotating linear objects like roads, pathways, or limbs in pose estimation.                         |
| [**Annotation with Ellipses**](/docs/manual/advanced/annotation-with-ellipses/)            | Ideal for objects like plates, balls, or eyes, where a circular or oval annotation is needed.                  |
| [**Annotation with Cuboids**](/docs/manual/advanced/annotation-with-cuboids/)              | Useful for 3D objects in 2D images, like boxes or furniture in room layouts.                                   |
| [**Annotation with Skeletons**](/docs/manual/advanced/skeletons/)                          | Ideal for human pose estimation, animation, and movement analysis in sports or medical fields.                 |
| [**Annotation with Brush Tool**](/docs/manual/advanced/annotation-with-brush-tool/)        | Perfect for intricate and detailed annotations where precision is key, such as in medical imaging.             |
| [**Annotation with Tags**](/docs/manual/advanced/annotation-with-tags/)                    | Useful for image and video classification tasks, like identifying scenes or themes in a dataset.               |

<!--lint enable maximum-line-length-->

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

### Cloud

| Name                                                                                      | Description                                                                                                                                                                                                                                                         |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [**User Manual**](/docs/manual/)                                                          | This comprehensive guide covers all CVAT tools available for work. It includes descriptions of all available tools, quality control methods, and procedures for importing and exporting data. This manual is relevant for both CVAT Cloud and Self-Hosted versions. |
| [**CVAT Complete Workflow Guide for Organizations**](/docs/getting_started/workflow-org/) | This guide provides a comprehensive overview of using CVAT for collaboration in organizations.                                                                                                                                                                      |
| [**Subscription Management**](/docs/enterprise/subscription-managment/)                   | Learn how to [**choose a plan**](https://www.cvat.ai/post/cvat-ai-pricing-plans-choosing-the-right-plan-for-your-needs), subscribe, and manage your subscription effectively.                                                                                       |
| [**XML Annotation Format**](/docs/manual/advanced/xml_format/)                            | Detailed documentation on the XML format used for annotations in CVAT essential for understanding data structure and compatibility.                                                                                                                                 |
| [**Frequently Asked Questions**](/cvat/docs/faq/)                                         | This section addresses common queries and provides helpful answers and insights about using CVAT.                                                                                                                                                                   |

### Self-Hosted

| Name                                                                                           | Description                                                                                                                                                                                                                |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [**Self-hosted Installation Guide**](/docs/administration/basics/installation/)                | Start here to install self-hosted solution on your premises.                                                                                                                                                               |
| [**Dataset Management Framework**](https://github.com/cvat-ai/datumaro/blob/develop/README.md) | Specifically for the Self-Hosted version, this framework and CLI tool are essential for building, transforming, and analyzing datasets.                                                                                    |
| [**Server API**](/docs/api_sdk/api/)                                                           | The CVAT server offers a HTTP REST API for interactions. This section explains how client applications, whether they are command line tools, browsers, or scripts, interact with CVAT through HTTP requests and responses. |
| [**Python SDK**](/docs/api_sdk/sdk/)                                                           | The CVAT SDK is a Python library providing access to server interactions and additional functionalities like data validation and serialization.                                                                            |
| [**Command Line Tool**](/docs/api_sdk/cli/)                                                    | This tool offers a straightforward command line interface for managing CVAT tasks. Currently featuring basic functionalities, it has the potential to develop into a more advanced administration tool for CVAT.           |
| [**XML Annotation Format**](/docs/manual/advanced/xml_format/)                                 | Detailed documentation on the XML format used for annotations in CVAT essential for understanding data structure and compatibility.                                                                                        |
| [**AWS Deployment Guide**](/docs/administration/basics/aws-deployment-guide/)                  | A step-by-step guide for deploying CVAT on Amazon Web Services, covering all necessary procedures and tips.                                                                                                                |
| [**Frequently Asked Questions**](/cvat/docs/faq/)                                              | This section addresses common queries and provides helpful answers and insights about using CVAT.                                                                                                                          |

<!--lint enable maximum-line-length-->

## Integrations

CVAT is a global tool, trusted and utilized by teams worldwide.
Below is a list of key companies that contribute significantly to our
product support or are an integral part of our ecosystem.

> **Note:** If you're using CVAT, we'd love to
> hear from you at [contact@cvat.ai](mailto:contact+github@cvat.ai).

<!--lint disable maximum-line-length-->

| Integrated Service                                                                                     | Available In          | Description                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------ | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [**Human Protocol**](https://hmt.ai)                                                                   | Cloud and Self-hosted | Incorporates CVAT to augment annotation services within the Human Protocol framework, enhancing its capabilities in data labeling.                                                                                                              |
| [**FiftyOne**](https://fiftyone.ai)                                                                    | Cloud and Self-hosted | An open-source tool for dataset management and model analysis in computer vision, FiftyOne is [closely integrated](https://voxel51.com/docs/fiftyone/integrations/cvat.html) with CVAT to enhance annotation capabilities and label refinement. |
| [**Toloka**](https://toloka.ai)                                                                        | Cloud                 | Utilizes CVAT for crowdsourced data labeling and annotation services, enriching Toloka's diverse task handling capabilities. For more information, see [**Integration with Toloka**](/docs/integration/toloka/).                                |
| [**Hugging Face and Roboflow**](https://www.cvat.ai/post/integrating-hugging-face-and-roboflow-models) | Cloud                 | In CVAT Cloud, models from [**Hugging Face**](https://huggingface.co/) and [**Roboflow**](https://roboflow.com/) can be added to enhance computer vision tasks.                                                                                 |

<!--lint enable maximum-line-length-->

## License Information

CVAT includes the following licenses:

<!--lint disable maximum-line-length-->

| License Type                                           | Applicable To          | Description                                                                                                                                                                                                                                   |
| ------------------------------------------------------ | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [**MIT License**](https://opensource.org/licenses/MIT) | Self-hosted            | This code is distributed under the MIT License, a permissive free software license that allows for broad use, modification, and distribution.                                                                                                 |
| [**LGPL License (FFmpeg)**](https://www.ffmpeg.org)    | Cloud and Self-hosted  | Incorporates LGPL-licensed components from the FFmpeg project. Users should verify if their use of FFmpeg requires additional licenses. CVAT.ai Corporation does not provide these licenses and is not liable for any related licensing fees. |
| [**Commercial License**](#)                            | Self-hosted Enterprise | For commercial use of the Enterprise solution of CVAT, a separate commercial license is applicable. This is tailored for businesses and commercial entities.                                                                                  |
| [**Terms of Use**](https://www.cvat.ai/terms-of-use)   | Cloud and Self-hosted  | Outlines the terms of use and confidential information handling for CVAT. Important for understanding the legal framework of using the platform.                                                                                              |

<!--lint enable maximum-line-length-->

## Get in touch

To get in touch, use one of the following channels:

<!--lint disable maximum-line-length-->

| Support Channel                                                                                    | Applicable To         | Description                                                                                          |
| -------------------------------------------------------------------------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------- |
| [**Discord Channel**](https://discord.gg/S6sRHhuQ7K)                                               | Cloud and Self-hosted | A space for broader discussions, questions, and all things related to CVAT.                          |
| [**LinkedIn**](https://www.linkedin.com/company/cvat-ai/)                                          | Cloud and Self-hosted | Follow for company updates, news, and employment opportunities.                                      |
| [**YouTube Channel**](https://www.youtube.com/@cvat-ai)                                            | Cloud and Self-hosted | Find tutorials and screencasts about CVAT tools.                                                     |
| [**GitHub Issues**](https://github.com/cvat-ai/cvat/issues)                                        | Cloud and Self-hosted | Report bugs or contribute to the ongoing development of CVAT.                                        |
| [**Customer Support Channel**](https://youtrack.cvat.ai/form/447d9c98-ab4b-466e-bf9d-004f01b22f73) | Cloud (Paid Users)    | Exclusive support for CVAT.ai cloud paid users.                                                      |
| **Commercial Support Inquiries**                                                                   | Cloud and Self-hosted | For direct commercial support inquiries, email [**contact@cvat.ai**](mailto:contact+github@cvat.ai). |

<!--lint enable maximum-line-length-->
