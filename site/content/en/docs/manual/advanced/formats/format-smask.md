---
title: 'Segmentation Mask'
linkTitle: 'Segmentation Mask'
weight: 6
description: 'How to export and import data in Segmentation Mask format'
---

Segmentation masks format is often used in the training of models for tasks
like semantic segmentation, instance segmentation, and panoptic segmentation.

Segmentation Mask in CVAT is
a format created by CVAT engineers
inside the [Pascal VOC](docs/manual/advanced/formats/format-voc/)

## Segmentation mask export

For export of images:

- Supported annotations: Bounding Boxes, Polygons.
- Attributes: Not supported.
- Tracks: Not supported.

The downloaded file is a .zip archive with the following structure:

```bash
taskname.zip/
├── labelmap.txt # optional, required for non-VOC labels
├── ImageSets/
│   └── Segmentation/
│       └── default.txt # list of image names without extension
├── SegmentationClass/ # merged class masks
│   ├── image1.png
│   └── image2.png
└── SegmentationObject/ # merged instance masks
    ├── image1.png
    └── image2.png

# labelmap.txt
# label : color (RGB) : 'body' parts : actions
background:0,128,0::
aeroplane:10,10,128::
bicycle:10,128,0::
bird:0,108,128::
boat:108,0,100::
bottle:18,0,8::
bus:12,28,0::
```

The mask is a `png` image that can have either 1 or 3 channels.
Each pixel in the image has a color that corresponds to a specific label.
The colors are generated according to the Pascal VOC [
algorithm](http://host.robots.ox.ac.uk/pascal/VOC/voc2012/htmldoc/devkit_doc.html#sec:voclabelcolormap).
By default, the color `(0, 0, 0)` is used to represent the background.

## Segmentation mask import

Uploaded file: a zip archive of the following structure:

```bash
  taskname.zip/
  ├── labelmap.txt # optional, required for non-VOC labels
  ├── ImageSets/
  │   └── Segmentation/
  │       └── <any_subset_name>.txt
  ├── SegmentationClass/
  │   ├── image1.png
  │   └── image2.png
  └── SegmentationObject/
      ├── image1.png
      └── image2.png
```

It is also possible to import grayscale (1-channel) PNG masks.
For grayscale masks provide a list of labels with the number of lines equal
to the maximum color index on images. The lines must be in the right order
so that line index is equal to the color index. Lines can have arbitrary,
but different, colors. If there are gaps in the used color
indices in the annotations, they must be filled with arbitrary dummy labels.
Example:

```
q:0,128,0:: # color index 0
aeroplane:10,10,128:: # color index 1
_dummy2:2,2,2:: # filler for color index 2
_dummy3:3,3,3:: # filler for color index 3
boat:108,0,100:: # color index 3
...
_dummy198:198,198,198:: # filler for color index 198
_dummy199:199,199,199:: # filler for color index 199
...
the last label:12,28,0:: # color index 200
```

- supported shapes: Polygons
