---
title: 'Data export formats'
linkTitle: 'Data export formats'
weight: 20
description: 'List of data export formats formats supported by CVAT.'
---

In CVAT, you have the option to export data in various formats.
The choice of export format depends on the type of annotation as
well as the intended future use of the dataset.
The table below outlines the available formats for data export in CVAT.

<!--lint disable maximum-line-length-->

|Format|Shapes|Attributes|Video Tracks|
|------|-----|------|-------|----|
|[CamVid](format-camvid)|Bounding Boxes, Polygons|All attributes|Not supported|
|[CVAT](format-cvat)|Bounding Boxes, Polygons, <br>Polylines, Points, Cuboids, <br>Skeletons, Tags, Tracks|All attributes|Supported|
|[COCO](format-coco)|Bounding Boxes, Polygons, <br> Skeletons|Specific attributes|Not supported|
|[Datumaro](format-datumaro)|All 2D shapes, labels|All attributes|Not supported|
|[ImageNet](format-imagenet)|Labels|No attributes|Not supported|
|[KITTI](format-kitti)|Bounding Boxes, Polygons|Specific attributes|Not supported|
|[LabelMe](format-labelme)|Bounding Boxes, Polygons|No attributes|Not supported|
|[LFW](format-lfw)|Tags, Points|Specific attributes|Not supported|
|[Market-1501](format-market1501)|Label|Specific attributes|Not supported|
|[MOT](format-mot)|Bounding Boxes, Polygons|Specific attributes|Supported|
|[MOTS PNG](format-mots)|Bounding Boxes, Polygons|No attributes|Supported|
|[Open Images](format-openimages)|Bounding Boxes, Tags, Polygons|Specific attributes|Not supported|
|[PASCAL VOC and mask](format-voc)|Bounding Boxes, Tags, Polygons|Specific attributes|Not supported|
|[VGGFace2](format-vggface2)|Bounding Boxes, Points|No attributes|Not supported|
|[WIDER Face](format-widerface)|Bounding Boxes, Labels|No attributes|Not supported|
|[YOLO](format-yolo)|Bounding Boxes|No attributes|Not supported|
|[TF detection API](format-tfrecord)|Bounding Boxes, Polygons|No attributes|Not supported|
|[ICDAR13/15](format-icdar)|Labels, Bounding Boxes, Polygons|Specific attributes|Not supported|


<!--lint enable maximum-line-length-->

For more information on the process, see the following tutorial:

<!--lint disable maximum-line-length-->


<iframe width="560" height="315" src="https://www.youtube.com/embed/gzjVpVV9orE?si=2tiBIqts8nk_byTH" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>

<!--lint enable maximum-line-length-->


