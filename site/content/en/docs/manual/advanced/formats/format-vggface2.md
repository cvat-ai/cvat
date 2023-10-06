---
title: 'VGGFace2'
linkTitle: 'VGGFace2'
weight: 12
description: 'How to export and import data in VGGFace2 format'
---

The VGGFace2 is primarily designed for face recognition tasks and is
most commonly used with deep learning models specifically designed for face recognition,
verification, and similar tasks.

For more information, see:

- [VGGFace2 Github](https://github.com/ox-vgg/vgg_face2)
- [Dataset examples](https://github.com/cvat-ai/datumaro/tree/v0.3/tests/assets/vgg_face2_dataset)

## VGGFace2 export

For export of images:

- Supported annotations: Bounding Boxes, Points (landmarks - groups of 5 points).
- Attributes: Not supported.
- Tracks: Not supported.

The downloaded file is a .zip archive with the following structure:

```bash
taskname.zip/
├── labels.txt # optional
├── <any_subset_name>/
|   ├── label0/
|   |   └── image1.jpg
|   └── label1/
|       └── image2.jpg
└── bb_landmark/
    ├── loose_bb_<any_subset_name>.csv
    └── loose_landmark_<any_subset_name>.csv
# labels.txt
# n000001 car
label0 <class0>
label1 <class1>
```

## VGGFace2 import

Uploaded file: a zip archive of the structure above

- supported annotations: Rectangles, Points (landmarks - groups of 5 points)
