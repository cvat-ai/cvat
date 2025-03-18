---
title: 'CVAT Overview'
linkTitle: 'Introduction to CVAT'
weight: 1
description: 'The open-source tool for image and video annotation'
---

Computer Vision Annotation Tool ([CVAT.ai](https://www.cvat.ai/)) is an open-source platform
designed for efficient image, video, and 3D annotation. Built by machine learning professionals,
CVAT enables the creation of high-quality datasets for training machine learning models for computer
vision projects. Using a data-centric AI approach, CVAT enhances quality and efficiency of data annotation,
which makes it the tool of choice in the computer vision community worldwide.



## Key features


### Versatile annotation tools

CVAT provides a rich set of annotation tools that address different aspects of
image and video labeling. Using CVAT, you can efficiently handle various tasks ranging from basic labeling
to complex, multidimensional tasks in advanced computer vision projects.

<details>
<summary>Click to view the list of supported annotation tools.</summary>
<br>

<!--lint disable maximum-line-length-->

| Annotation Tool                                                                                          | Use Cases                                                                                                      |
| -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| {{< ilink "/docs/manual/advanced/3d-object-annotation-advanced" "3D Object Annotation" >}}           | Ideal for projects that require depth perception and volume estimation, like autonomous vehicle training.      |
| {{< ilink "/docs/manual/advanced/attribute-annotation-mode-advanced" "Attribute Annotation Mode" >}} | Useful for adding detailed information to objects, like color, size, or other specific characteristics.        |
| {{< ilink "/docs/manual/advanced/annotation-with-rectangles" "Annotation with Rectangles" >}}        | Best for simple object detection where objects have a box-like shape, such as detecting windows in a building. |
| {{< ilink "/docs/manual/advanced/annotation-with-polygons" "Annotation with Polygons" >}}            | Suited for complex shapes in images, like outlining geographical features in maps or detailed product shapes.  |
| {{< ilink "/docs/manual/advanced/annotation-with-polylines" "Annotation with Polylines" >}}          | Great for annotating linear objects like roads, pathways, or limbs in pose estimation.                         |
| {{< ilink "/docs/manual/advanced/annotation-with-ellipses" "Annotation with Ellipses" >}}            | Ideal for objects like plates, balls, or eyes, where a circular or oval annotation is needed.                  |
| {{< ilink "/docs/manual/advanced/annotation-with-cuboids" "Annotation with Cuboids" >}}              | Useful for 3D objects in 2D images, like boxes or furniture in room layouts.                                   |
| {{< ilink "/docs/manual/advanced/skeletons" "Annotation with Skeletons" >}}                          | Ideal for human pose estimation, animation, and movement analysis in sports or medical fields.                 |
| {{< ilink "/docs/manual/advanced/annotation-with-brush-tool" "Annotation with Brush Tool" >}}        | Perfect for intricate and detailed annotations where precision is key, such as in medical imaging.             |
| {{< ilink "/docs/manual/advanced/annotation-with-tags" "Annotation with Tags" >}}                    | Useful for image and video classification tasks, like identifying scenes or themes in a dataset.               |

<!--lint enable maximum-line-length-->

</details>



### Automated labeling

CVAT supports semi-automatic and automatic labeling modes, which can accelerate data annotation up to 10 times.
The integrated {{< ilink "/docs/manual/advanced/ai-tools" "OpenCV and AI Tools" >}} leverage a whole range of
AI models, providing such features as object selection and segmentation, semi-automatic polygon creation,
point adjustments for better annotation accuracy, enhancing
image contrast, as well as tracking of moving objects across frames.


<details>
<summary>
Click to view the list of algorithms and frameworks supported by CVAT AI tools.
</summary>
<br>

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

</details>



### Multiple supported formats

CVAT supports the following input data formats:

- **For 3D**: `.pcd`, `.bin`
- **For image**: all formats supported by the Python
  [Pillow library](https://pillow.readthedocs.io/en/stable/handbook/image-file-formats.html),
  including `JPEG`, `PNG`, `BMP`, `GIF`, `PPM`, and `TIFF`
- **For video**: all formats supported by ffmpeg, including `MP4`, `AVI`, and `MOV`

For the list of supported export data formats, see
{{< ilink "/docs/manual/advanced/formats" "Export annotations and data from CVAT" >}}.



### Secure data storage

CVAT provides secure, private cloud storage for uploaded datasets and
integrates with third-party storage solutions, namely AWS S3, Google Cloud Storage, and Azure Blob Storage.


## CVAT editions

CVAT offers several free and paid deployment options for various needs.


### CVAT in the cloud

CVAT as a cloud service is the fastest way to get started with data annotation.
It is available at [https://app.cvat.ai/](https://app.cvat.ai/) as a web-based application.

The **free** flavor of CVAT Cloud
gives you access to the following features:

- Setting up organizations for team collaboration
- Automating data annotation
- Quality control and validation
- Secure data storage: AWS S3, Google Cloud Storage, or Azure Blob Storage
- Community support on GitHub and Discord

Choosing one of the [subscription plans](https://www.cvat.ai/pricing/cloud) removes restrictions on
data volumes, team collaboration, and usage of AI-assisted tools imposed by the free plan, as well as
adds the following features:

- Enhanced security features: Single Sign-On (SSO), role-based access control, and audit logs
- Integration with [Roboflow and HuggingFace](https://www.cvat.ai/post/integrating-hugging-face-and-roboflow-models)
  deep learning models
- Performance monitoring and analytics
- Automatic annotation for batches of images
- Dedicated customer support


For a detailed comparison of available subscription plans, see [https://www.cvat.ai/pricing/cvat-online](https://www.cvat.ai/pricing/cvat-online).



### CVAT on-premises

CVAT can be deployed locally on your own infrastructure as a self-hosted solution,
available as a free Community edition, as well as Enterprise Basic and Enterprise Premium editions.
As compared to CVAT Cloud, self-hosted installations offer greater control over
data privacy and security, include a command-line interface, and provide access to the API for
customizing and extending CVAT, tailoring it to your specific needs.


For a detailed comparison of features included into different self-hosted editions of CVAT, see [https://www.cvat.ai/pricing/cvat-on-prem](https://www.cvat.ai/pricing/cvat-on-prem).



### Legal Information

CVAT is provided under the following licenses:

<!--lint disable maximum-line-length-->

| License Type                                           | Applicable To          | Description                                                                                                                                                                                                                                   |
| ------------------------------------------------------ | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [MIT License](https://opensource.org/licenses/MIT) | Self-hosted            | This code is distributed under the MIT License, a permissive free software license that allows for broad use, modification, and distribution.                                                                                                 |
| [LGPL License (FFmpeg)](https://www.ffmpeg.org)    | Cloud and Self-hosted  | Incorporates LGPL-licensed components from the FFmpeg project. Users should verify if their use of FFmpeg requires additional licenses. CVAT.ai Corporation does not provide these licenses and is not liable for any related licensing fees. |
| Commercial License                                 | Self-hosted Enterprise | For commercial use of the Enterprise solution of CVAT, a separate commercial license is applicable. This is tailored for businesses and commercial entities.                                                                                  |
| [Terms of Use](https://www.cvat.ai/terms-of-use)   | Cloud and Self-hosted  | Outlines the terms of use and confidential information handling for CVAT. Important for understanding the legal framework of using the platform.                                                                                              |
| [Privacy Policy](https://www.cvat.ai/privacy)      | Cloud                  | Our Privacy Policy governs your visit to <https://cvat.ai> and your use of <https://app.cvat.ai>, and explains how we collect, safeguard and disclose information that results from your use of our Service.                                  |

<!--lint enable maximum-line-length-->


## Community and Support

### Integrations

CVAT is an open-source platform, trusted and used by teams worldwide.
Below is a list of key companies that significantly contribute to our
product support and are an integral part of our ecosystem.

> **Note:** If you are using CVAT, you can reach out to us
> at [contact@cvat.ai](mailto:contact+github@cvat.ai).

<!--lint disable maximum-line-length-->

| Integrated Service                                                                  | Description                                                                                                                                                                                                                                           |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Human Protocol](https://hmt.ai)                                                | Incorporates CVAT to augment annotation services within the Human Protocol framework, enhancing its capabilities in data labeling.                                                                                                                    |
| [FiftyOne](https://fiftyone.ai)                                                 | An open-source tool for dataset management and model analysis in computer vision, FiftyOne is [closely integrated](https://voxel51.com/docs/fiftyone/integrations/cvat.html) with CVAT to enhance annotation capabilities and label refinement.       |
| [Hugging Face](https://huggingface.co/) & [Roboflow](https://roboflow.com/) | In CVAT Cloud, models from Hugging Face and Roboflow can be added to enhance computer vision tasks. For more information, see [Integration with Hugging Face and Roboflow](https://www.cvat.ai/post/integrating-hugging-face-and-roboflow-models) |

<!--lint enable maximum-line-length-->



### Get in touch

To get in touch, use the following channels:

- [Discord Channel](https://discord.gg/S6sRHhuQ7K) - Ask questions and participate in broader discussions
  related to CVAT.
- [LinkedIn](https://www.linkedin.com/company/cvat-ai/)- Follow company updates, news, and employment opportunities.
- [YouTube Channel](https://www.youtube.com/@cvat-ai) - View tutorials and screencasts about CVAT tools.
- [GitHub](https://github.com/cvat-ai/cvat/issues) - Report bugs and contribute to CVAT development.


If you have a paid subscription for CVAT.ai, you can get exclusive support through our [Customer Support Channel](https://youtrack.cvat.ai/form/447d9c98-ab4b-466e-bf9d-004f01b22f73).


For commercial inquiries, please contact us at [contact@cvat.ai](mailto:contact+github@cvat.ai).


## Next Steps

Check out the following resources to get started with CVAT:

<!--lint disable maximum-line-length-->

### Cloud

| Name                                                                                                    | Description                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| {{< ilink "/docs/manual" "User Manual" >}}                                                          | This comprehensive guide covers all CVAT tools available for work. It includes descriptions of all available tools, quality control methods, and procedures for importing and exporting data. This manual is relevant for both CVAT Cloud and Self-Hosted versions. |
| {{< ilink "/docs/getting_started/workflow-org" "CVAT Complete Workflow Guide for Organizations" >}} | This guide provides a comprehensive overview of using CVAT for collaboration in organizations.                                                                                                                                                                      |
| {{< ilink "/docs/enterprise/subscription-management" "Subscription Management" >}}                  | Learn how to [choose a plan](https://www.cvat.ai/post/cvat-ai-pricing-plans-choosing-the-right-plan-for-your-needs), subscribe, and manage your subscription effectively.                                                                                       |
| {{< ilink "/docs/manual/advanced/xml_format" "XML Annotation Format" >}}                            | Detailed documentation on the XML format used for annotations in CVAT essential for understanding data structure and compatibility.                                                                                                                                 |

### Self-Hosted

| Name                                                                                           | Description                                                                                                                                                                                                                |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| {{< ilink "/docs/administration/basics/installation" "Self-hosted Installation Guide" >}}  | Start here to install self-hosted solution on your premises.                                                                                                                                                               |
| [Dataset Management Framework](https://github.com/cvat-ai/datumaro/blob/develop/README.md) | Specifically for the Self-Hosted version, this framework and CLI tool are essential for building, transforming, and analyzing datasets.                                                                                    |
| {{< ilink "/docs/api_sdk/api" "Server API" >}}                                             | The CVAT server offers a HTTP REST API for interactions. This section explains how client applications, whether they are command line tools, browsers, or scripts, interact with CVAT through HTTP requests and responses. |
| {{< ilink "/docs/api_sdk/sdk" "Python SDK" >}}                                             | The CVAT SDK is a Python library providing access to server interactions and additional functionalities like data validation and serialization.                                                                            |
| {{< ilink "/docs/api_sdk/cli" "Command Line Tool" >}}                                      | This tool offers a straightforward command line interface for managing CVAT tasks. Currently featuring basic functionalities, it has the potential to develop into a more advanced administration tool for CVAT.           |
| {{< ilink "/docs/manual/advanced/xml_format" "XML Annotation Format" >}}                   | Detailed documentation on the XML format used for annotations in CVAT essential for understanding data structure and compatibility.                                                                                        |
| {{< ilink "/docs/administration/basics/aws-deployment-guide" "AWS Deployment Guide" >}}    | A step-by-step guide for deploying CVAT on Amazon Web Services, covering all necessary procedures and tips.                                                                                                                |
| {{< ilink "/docs/faq" "Frequently Asked Questions" >}}                                     | This section addresses common queries and provides helpful answers and insights about using CVAT.                                                                                                                          |

<!--lint enable maximum-line-length-->


