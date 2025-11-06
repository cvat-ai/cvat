---
title: 'Segmentation Mask'
linkTitle: 'Segmentation Mask'
weight: 6
description: 'How to export and import data in Segmentation Mask format'
aliases:
 - /docs/manual/advanced/formats/format-smask/
---

Segmentation Mask format is a simple format for image segmentation tasks
like semantic segmentation, instance segmentation, and panoptic segmentation.
It is a custom format based on
the {{< ilink "/docs/dataset_management/formats/format-voc" "Pascal VOC" >}} segmentation format.

## Segmentation Mask export

- Supported annotations: Masks, Bounding Boxes (as masks), Polygons (as masks), Ellipses (as masks).
- Attributes: Not supported.
- Tracks: Not supported (exported as separate shapes).

The downloaded file is a `.zip` archive with the following structure:

```bash
taskname.zip/
├── labelmap.txt # optional, required for non-Pascal VOC labels
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

A mask is a `.png` image that can have either 1 or 3 channels.
Each pixel in the image has a color that corresponds to a specific label.
The colors are generated according to the Pascal VOC [
algorithm](http://host.robots.ox.ac.uk/pascal/VOC/voc2012/htmldoc/devkit_doc.html#sec:voclabelcolormap).
By default, the color `(0, 0, 0)` is used to represent the background.

## Segmentation Mask import

- Supported annotations: Masks, Polygons (if Convert masks to polygons is enabled).
- Attributes: Not supported.
- Tracks: Not supported.

Uploaded file: a `.zip` archive of the following structure:

```bash
archive.zip/
├── labelmap.txt # optional, required for non-Pascal VOC labels
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


The format supports both 3-channel and grayscale (1-channel) PNG masks.

To import 3-channel masks, the `labelmap.txt` file should declare all the colors used in
the dataset:
```
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

To import 1-channel masks, the `labelmap.txt` file should declare all the indices used in
the dataset with no gaps. The number of lines must be equal
to the maximum color index on images. The lines must be in the right order
so that line index is equal to the color index. Lines can have arbitrary,
but different, colors. If there are gaps in the used color
indices in the annotations, they must be filled with arbitrary dummy labels.
```
# labelmap.txt
# label : color (RGB) : 'body' parts : actions
q:0,128,0:: # color index 0
aeroplane:10,10,128:: # color index 1
_dummy2:2,2,2:: # filler for color index 2
_dummy3:3,3,3:: # filler for color index 3
boat:108,0,100:: # color index 4
...
_dummy198:198,198,198:: # filler for color index 198
_dummy199:199,199,199:: # filler for color index 199
...
the last label:12,28,0:: # color index 200
```

