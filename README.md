![CVAT logo](site/content/en/images/cvat_poster_with_name.png)
# Computer Vision Annotation Tool (CVAT)

<a href="https://www.producthunt.com/posts/cvat-computer-vision-annotation-tool?utm_source=badge-featured&utm_medium=badge&utm_souce=badge-cvat&#0045;computer&#0045;vision&#0045;annotation&#0045;tool" target="_blank"><img src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=353415&theme=light" alt="CVAT&#0032;–&#0032;Computer&#0032;Vision&#0032;Annotation&#0032;Tool - The&#0032;open&#0032;data&#0032;annotation&#0032;platform&#0032;for&#0032;AI | Product Hunt" style="width: 250px; height: 54px;" width="250" height="54" /></a>

[![CI][ci-img]][ci-url]
[![Gitter chat][gitter-img]][gitter-url]
[![Discord][discord-img]][discord-url]
[![Coverage Status][coverage-img]][coverage-url]
[![server pulls][docker-server-pulls-img]][docker-server-image-url]
[![ui pulls][docker-ui-pulls-img]][docker-ui-image-url]
[![DOI][doi-img]][doi-url]

CVAT is an interactive video and image annotation
tool for computer vision. It is used by tens of thousands of users and
companies around the world. CVAT is free and open-source.

**A new repo**: CVAT core team moved the active development of the tool
to this new repository. Our mission is to help developers, companies and
organizations around the world to solve real problems using the Data-centric
AI approach.

Start using CVAT online for free: [cvat.ai](https://cvat.ai). Or set it up as a self-hosted solution:
[read here](https://opencv.github.io/cvat/docs/administration/basics/installation/).

![CVAT screencast](site/content/en/images/cvat-ai-screencast.gif)

## Quick start ⚡

- [Installation guide](https://opencv.github.io/cvat/docs/administration/basics/installation/)
- [Manual](https://opencv.github.io/cvat/docs/manual/)
- [Contributing](https://opencv.github.io/cvat/docs/contributing/)
- [Datumaro dataset framework](https://github.com/cvat-ai/datumaro/blob/develop/README.md)
- [Server API](#api)
- [Python SDK](#sdk)
- [Command line tool](#cli)
- [XML annotation format](https://opencv.github.io/cvat/docs/manual/advanced/xml_format/)
- [AWS Deployment Guide](https://opencv.github.io/cvat/docs/administration/basics/aws-deployment-guide/)
- [Frequently asked questions](https://opencv.github.io/cvat/docs/faq/)
- [Where to ask questions](#where-to-ask-questions)

## Partners ❤️

CVAT is used by teams all over the world. If you use us, please drop us a line at
[contact@cvat.ai](mailto:contact+github@cvat.ai) - and we'll add you to this list.

- [ATLANTIS](https://github.com/smhassanerfani/atlantis), an open-source dataset for semantic segmentation
  of waterbody images, depeloped by [iWERS](http://ce.sc.edu/iwers/) group in the
  Department of Civil and Environmental Engineering at University of South Carolina, is using CVAT.
  For developing a semantic segmentation dataset using CVAT, please check
  [ATLANTIS published article](https://www.sciencedirect.com/science/article/pii/S1364815222000391),
  [ATLANTIS Development Kit](https://github.com/smhassanerfani/atlantis/tree/master/adk)
  and [annotation tutorial videos](https://www.youtube.com/playlist?list=PLIfLGY-zZChS5trt7Lc3MfNhab7OWl2BR).
- [Onepanel](https://github.com/onepanelio/core) is an open-source
  vision AI platform that fully integrates CVAT with scalable data processing
  and parallelized training pipelines.
- [DataIsKey](https://dataiskey.eu/annotation-tool/) uses CVAT as their prime data labeling tool
  to offer annotation services for projects of any size.
- [Human Protocol](https://hmt.ai) uses CVAT as a way of adding annotation service to the Human Protocol.
- [Cogito Tech LLC](https://bit.ly/3klT0h6), a Human-in-the-Loop Workforce Solutions Provider, used CVAT
  in annotation of about 5,000 images for a brand operating in the fashion segment.
- [FiftyOne](https://fiftyone.ai) is an open-source dataset curation and model analysis
tool for visualizing, exploring, and improving computer vision datasets and models that is
[tightly integrated](https://voxel51.com/docs/fiftyone/integrations/cvat.html) with CVAT
for annotation and label refinement.

## CVAT online: [cvat.ai](https://cvat.ai)

This is an online version of CVAT. It's free, efficient, and easy to use.

[cvat.ai](https://cvat.ai) runs the latest version of the tool. You can create up
to 10 tasks there and upload up to 500Mb of data to annotate. It will only be
visible to you or people you assign to it.

For now, it does not have [analytics features](https://opencv.github.io/cvat/docs/administration/advanced/analytics/)
like management and monitoring the data annotation team.

We plan to enhance [cvat.ai](https://cvat.ai) with new powerful features. Stay tuned!

## Prebuilt Docker images 🐳

Prebuilt docker images are the easiest way to start using CVAT locally. They are available on Docker Hub:

- [cvat/server](https://hub.docker.com/r/cvat/server)
- [cvat/ui](https://hub.docker.com/r/cvat/ui)

The images have been downloaded more than 1M times so far.

## Screencasts 🎦

Here are some screencasts showing how to use CVAT.

- [Introduction](https://youtu.be/JERohTFp-NI)
- [Annotation mode](https://youtu.be/vH_639N67HI)
- [Interpolation of bounding boxes](https://youtu.be/Hc3oudNuDsY)
- [Interpolation of polygons](https://youtu.be/K4nis9lk92s)
- [Tag annotation video](https://youtu.be/62bI4mF-Xfk)
- [Attribute mode](https://youtu.be/iIkJsOkDzVA)
- [Segmentation mode](https://youtu.be/9Fe_GzMLo3E)
- [Tutorial for polygons](https://youtu.be/C7-r9lZbjBw)
- [Semi-automatic segmentation](https://youtu.be/9HszWP_qsRQ)

## API

- [Documentation](https://opencv.github.io/cvat/docs/api_sdk/api/)

## SDK

- Install with `pip install cvat-sdk`
- [PyPI package homepage](https://pypi.org/project/cvat-sdk/)
- [Documentation](https://opencv.github.io/cvat/docs/api_sdk/sdk/)

## CLI

- Install with `pip install cvat-cli`
- [PyPI package homepage](https://pypi.org/project/cvat-cli/)
- [Documentation](https://opencv.github.io/cvat/docs/api_sdk/cli/)

## Supported annotation formats

CVAT supports multiple annotation formats. You can select the format after clicking the "Upload annotation" and "Dump
annotation" buttons. [Datumaro](https://github.com/cvat-ai/datumaro)
dataset framework allows additional dataset transformations via its command
line tool and Python library.

For more information about the supported formats, look at the
[documentation](https://opencv.github.io/cvat/docs/manual/advanced/formats/).

<!--lint disable maximum-line-length-->

| Annotation format                                                                                         | Import | Export |
| --------------------------------------------------------------------------------------------------------- | ------ | ------ |
| [CVAT for images](https://opencv.github.io/cvat/docs/manual/advanced/xml_format/#annotation)     |   ✔️    |   ✔️    |
| [CVAT for a video](https://opencv.github.io/cvat/docs/manual/advanced/xml_format/#interpolation) |   ✔️    |   ✔️    |
| [Datumaro](https://github.com/cvat-ai/datumaro)                                                   |        |   ✔️    |
| [PASCAL VOC](http://host.robots.ox.ac.uk/pascal/VOC/)                                                     |   ✔️    |   ✔️    |
| Segmentation masks from [PASCAL VOC](http://host.robots.ox.ac.uk/pascal/VOC/)                             |   ✔️    |   ✔️    |
| [YOLO](https://pjreddie.com/darknet/yolo/)                                                                |   ✔️    |   ✔️    |
| [MS COCO Object Detection](http://cocodataset.org/#format-data)                                           |   ✔️    |   ✔️    |
| [MS COCO Keypoints Detection](http://cocodataset.org/#format-data)                                        |   ✔️    |   ✔️    |
| [TFrecord](https://www.tensorflow.org/tutorials/load_data/tfrecord)                                       |   ✔️    |   ✔️    |
| [MOT](https://motchallenge.net/)                                                                          |   ✔️    |   ✔️    |
| [LabelMe 3.0](http://labelme.csail.mit.edu/Release3.0)                                                    |   ✔️    |   ✔️    |
| [ImageNet](http://www.image-net.org)                                                                      |   ✔️    |   ✔️    |
| [CamVid](http://mi.eng.cam.ac.uk/research/projects/VideoRec/CamVid/)                                      |   ✔️    |   ✔️    |
| [WIDER Face](http://shuoyang1213.me/WIDERFACE/)                                                           |   ✔️    |   ✔️    |
| [VGGFace2](https://github.com/ox-vgg/vgg_face2)                                                           |   ✔️    |   ✔️    |
| [Market-1501](https://www.aitribune.com/dataset/2018051063)                                               |   ✔️    |   ✔️    |
| [ICDAR13/15](https://rrc.cvc.uab.es/?ch=2)                                                                |   ✔️    |   ✔️    |
| [Open Images V6](https://storage.googleapis.com/openimages/web/index.html)                                |   ✔️    |   ✔️    |
| [Cityscapes](https://www.cityscapes-dataset.com/login/)                                                   |   ✔️    |   ✔️    |
| [KITTI](http://www.cvlibs.net/datasets/kitti/)                                                            |   ✔️    |   ✔️    |
| [LFW](http://vis-www.cs.umass.edu/lfw/)                                                                   |   ✔️    |   ✔️    |

<!--lint enable maximum-line-length-->

## Deep learning serverless functions for automatic labeling

CVAT supports automatic labelling. It can speed up the annotation process
up to 10x. Here is a list of the algorithms we support, and the platforms they
can be ran on:

<!--lint disable maximum-line-length-->

| Name                                                                                                    | Type       | Framework  | CPU | GPU |
| ------------------------------------------------------------------------------------------------------- | ---------- | ---------- | --- | --- |
| [Deep Extreme Cut](/serverless/openvino/dextr/nuclio)                                                   | interactor | OpenVINO   |  ✔️  |     |
| [Faster RCNN](/serverless/openvino/omz/public/faster_rcnn_inception_v2_coco/nuclio)                     | detector   | OpenVINO   |  ✔️  |     |
| [Mask RCNN](/serverless/openvino/omz/public/mask_rcnn_inception_resnet_v2_atrous_coco/nuclio)           | detector   | OpenVINO   |  ✔️  |     |
| [YOLO v3](/serverless/openvino/omz/public/yolo-v3-tf/nuclio)                                            | detector   | OpenVINO   |  ✔️  |     |
| [Object reidentification](/serverless/openvino/omz/intel/person-reidentification-retail-300/nuclio)     | reid       | OpenVINO   |  ✔️  |     |
| [Semantic segmentation for ADAS](/serverless/openvino/omz/intel/semantic-segmentation-adas-0001/nuclio) | detector   | OpenVINO   |  ✔️  |     |
| [Text detection v4](/serverless/openvino/omz/intel/text-detection-0004/nuclio)                          | detector   | OpenVINO   |  ✔️  |     |
| [YOLO v5](/serverless/pytorch/ultralytics/yolov5/nuclio)                                                | detector   | PyTorch    |  ✔️  |     |
| [SiamMask](/serverless/pytorch/foolwood/siammask/nuclio)                                                | tracker    | PyTorch    |  ✔️  |  ✔️  |
| [f-BRS](/serverless/pytorch/saic-vul/fbrs/nuclio)                                                       | interactor | PyTorch    |  ✔️  |     |
| [HRNet](/serverless/pytorch/saic-vul/hrnet/nuclio)                                                      | interactor | PyTorch    |     |  ✔️  |
| [Inside-Outside Guidance](/serverless/pytorch/shiyinzhang/iog/nuclio)                                   | interactor | PyTorch    |  ✔️  |     |
| [Faster RCNN](/serverless/tensorflow/faster_rcnn_inception_v2_coco/nuclio)                              | detector   | TensorFlow |  ✔️  |  ✔️  |
| [Mask RCNN](/serverless/tensorflow/matterport/mask_rcnn/nuclio)                                         | detector   | TensorFlow |  ✔️  |  ✔️  |
| [RetinaNet](serverless/pytorch/facebookresearch/detectron2/retinanet/nuclio)                            | detector   | PyTorch    |  ✔️  |  ✔️  |
| [Face Detection](/serverless/openvino/omz/intel/face-detection-0205/nuclio)                             | detector   | OpenVINO   |  ✔️  |     |

<!--lint enable maximum-line-length-->

## License

The code is released under the [MIT License](https://opensource.org/licenses/MIT).

This software uses LGPL licensed libraries from the [FFmpeg](https://www.ffmpeg.org) project.
The exact steps on how FFmpeg was configured and compiled can be found in the [Dockerfile](Dockerfile).

FFmpeg is an open source framework licensed under LGPL and GPL.
See [https://www.ffmpeg.org/legal.html](https://www.ffmpeg.org/legal.html). You are solely responsible
for determining if your use of FFmpeg requires any
additional licenses. CVAT.ai Corporation is not responsible for obtaining any
such licenses, nor liable for any licensing fees due in
connection with your use of FFmpeg.

## Where to ask questions

[Gitter chat][gitter-url]: you can post CVAT usage related questions there.
Typically they get answered fast by the core team or community. There you can also browse other common questions.

[Discord][discord-url] is the place to also ask questions or discuss any other stuff related to CVAT.

[GitHub issues](https://github.com/cvat-ai/cvat/issues): please post them for feature requests or bug reports.
If it's a bug, please add the steps to reproduce it.

[\#cvat](https://stackoverflow.com/search?q=%23cvat) tag on StackOverflow is one more way to ask
questions and get our support.

[contact@cvat.ai](mailto:contact+github@cvat.ai): reach out to us with feedback, comments, or inquiries.

## Links

- [Intel AI blog: New Computer Vision Tool Accelerates Annotation of Digital Images and Video](https://www.intel.ai/introducing-cvat)
- [Intel Software: Computer Vision Annotation Tool: A Universal Approach to Data Annotation](https://software.intel.com/en-us/articles/computer-vision-annotation-tool-a-universal-approach-to-data-annotation)
- [VentureBeat: Intel open-sources CVAT, a toolkit for data labeling](https://venturebeat.com/2019/03/05/intel-open-sources-cvat-a-toolkit-for-data-labeling/)

  <!-- prettier-ignore-start -->
  <!-- Badges -->

[docker-server-pulls-img]: https://img.shields.io/docker/pulls/cvat/server.svg?style=flat-square&label=server%20pulls
[docker-server-image-url]: https://hub.docker.com/r/cvat/server

[docker-ui-pulls-img]: https://img.shields.io/docker/pulls/cvat/ui.svg?style=flat-square&label=UI%20pulls
[docker-ui-image-url]: https://hub.docker.com/r/cvat/ui

[ci-img]: https://github.com/cvat-ai/cvat/workflows/CI/badge.svg?branch=develop
[ci-url]: https://github.com/cvat-ai/cvat/actions

[gitter-img]: https://img.shields.io/gitter/room/opencv-cvat/public?style=flat
[gitter-url]: https://gitter.im/opencv-cvat

[coverage-img]: https://coveralls.io/repos/github/cvat-ai/cvat/badge.svg?branch=develop
[coverage-url]: https://coveralls.io/github/cvat-ai/cvat?branch=develop

[doi-img]: https://zenodo.org/badge/139156354.svg
[doi-url]: https://zenodo.org/badge/latestdoi/139156354

[discord-img]: https://img.shields.io/discord/1000789942802337834?label=discord
[discord-url]: https://discord.gg/fNR3eXfk6C
