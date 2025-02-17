---
title: 'CamVid'
linkTitle: 'CamVid'
weight: 10
description: 'How to export and import data in CamVid format'
---

The CamVid (Cambridge-driving Labeled Video Database) format is most commonly used
in the realm of semantic segmentation tasks. It is particularly useful for training
and evaluating models for autonomous driving and other vision-based robotics
applications.

For more information, see:

- [CamVid Specification](http://mi.eng.cam.ac.uk/research/projects/VideoRec/CamVid/)
- [Dataset examples](https://github.com/cvat-ai/datumaro/tree/v0.3/tests/assets/camvid_dataset)

## CamVid export

For export of images and videos:

- Supported annotations: Bounding Boxes, Polygons.
- Attributes: Not supported.
- Tracks: Not supported.

The downloaded file is a .zip archive with the following structure:

```bash
taskname.zip/
├── label_colors.txt # optional, required for non-CamVid labels
├── <any_subset_name>/
|   ├── image1.png
|   └── image2.png
├── <any_subset_name>annot/
|   ├── image1.png
|   └── image2.png
└── <any_subset_name>.txt

# label_colors.txt (with color value type)
# if you want to manually set the color for labels, configure label_colors.txt as follows:
# color (RGB) label
0 0 0 Void
64 128 64 Animal
192 0 128 Archway
0 128 192 Bicyclist
0 128 64 Bridge

# label_colors.txt (without color value type)
# if you do not manually set the color for labels, it will be set automatically:
# label
Void
Animal
Archway
Bicyclist
Bridge
```

A mask in the CamVid dataset is typically a **.png**
image with either one or three channels.

In this image, each pixel is assigned a specific color
that corresponds to a particular label.

By default, the color `(0, 0, 0)`—or `black`—is used
to represent the background.

## CamVid import

For import of images:

- Uploaded file: a _.zip_ archive of the structure above
- supported annotations: Polygons
