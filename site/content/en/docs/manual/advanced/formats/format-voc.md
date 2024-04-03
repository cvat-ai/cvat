---
title: 'Pascal VOC'
linkTitle: 'Pascal VOC'
weight: 6
description: 'How to export and import data in Pascal VOC format'
---

The Pascal VOC (Visual Object Classes) format
is one of the earlier established benchmarks for object classification and detection,
which provides a standardized image data set for object class recognition.

The export data format is XML-based and has been widely adopted in computer vision tasks.

For more information, see:

- [Pascal VOC](http://host.robots.ox.ac.uk/pascal/VOC/)
- [Format specification](http://host.robots.ox.ac.uk/pascal/VOC/voc2012/devkit_doc.pdf)
- [Dataset examples](https://github.com/cvat-ai/datumaro/tree/v0.3/tests/assets/voc_dataset)

## Pascal VOC export

For export of images:

- Supported annotations: Bounding Boxes (detection),
  Tags (classification), Polygons (segmentation)
- Attributes:
  - `occluded` as both UI option and a separate attribute.
  - `truncated` and `difficult` must be defined for labels as `checkbox`.
  - Arbitrary attributes in the `attributes` section of XML files.
- Tracks: Not supported.

The downloaded file is a .zip archive with the following structure:

```bash
taskname.zip/
├── JPEGImages/
│   ├── <image_name1>.jpg
│   ├── <image_name2>.jpg
│   └── <image_nameN>.jpg
├── Annotations/
│   ├── <image_name1>.xml
│   ├── <image_name2>.xml
│   └── <image_nameN>.xml
├── ImageSets/
│   └── Main/
│       └── default.txt
└── labelmap.txt

# labelmap.txt
# label : color_rgb : 'body' parts : actions
background:::
aeroplane:::
bicycle:::
bird:::
```

## Pascal VOC import

Supported attributes: action attributes (import only, should be defined as `checkbox` -es)

Uploaded file: a zip archive of the structure declared above or the following:

```bash
taskname.zip/
├── <image_name1>.xml
├── <image_name2>.xml
└── <image_nameN>.xml
```

It must be possible for CVAT to match the frame name and file name
from annotation `.xml` file (the `filename` tag, e. g.
`<filename>2008_004457.jpg</filename>` ).

There are 2 options:

1. full match between frame name and file name from annotation `.xml`
   (in cases when task was created from images or image archive).

1. match by frame number. File name should be `<number>.jpg`
   or `frame_000000.jpg`. It should be used when task was created from video.

## How to create a task from Pascal VOC dataset

1. Download the Pascal Voc dataset (Can be downloaded from the
   [PASCAL VOC website](http://host.robots.ox.ac.uk/pascal/VOC/))

1. Create a CVAT task with the following labels:

   ```bash
   aeroplane bicycle bird boat bottle bus car cat chair cow diningtable
   dog horse motorbike person pottedplant sheep sofa train tvmonitor
   ```

   You can add `~checkbox=difficult:false ~checkbox=truncated:false`
   attributes for each label if you want to use them.

   Select interesting image files
   (See {{< ilink "/docs/manual/basics/create_an_annotation_task" "Creating an annotation task" >}} guide for details)

1. zip the corresponding annotation files

1. click `Upload annotation` button, choose `Pascal VOC ZIP 1.1`

   and select the zip file with annotations from previous step.
   It may take some time.
