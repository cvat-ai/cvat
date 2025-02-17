---
title: 'Wider Face'
linkTitle: 'Wider Face'
weight: 9
description: 'How to export and import data in Wider Face format'
---

The WIDER Face dataset is widely used for face detection tasks.
Many popular models for object detection and face detection
specifically are trained on this dataset for benchmarking and deployment.

For more information, see:

- [WIDER Face Specification](http://shuoyang1213.me/WIDERFACE/)
- [Dataset examples](https://github.com/cvat-ai/datumaro/tree/v0.3/tests/assets/widerface_dataset)

## WIDER Face export

For export of images:

- Supported annotations: Bounding Boxes (with attributes), Tags.
- Attributes:
  - `blur`, `expression`, `illumination`, `pose`, `invalid`
  - `occluded` (both the annotation property & an attribute).
- Tracks: Not supported.

The downloaded file is a .zip archive with the following structure:

```bash
taskname.zip/
├── labels.txt # optional
├── wider_face_split/
│   └── wider_face_<any_subset_name>_bbx_gt.txt
└── WIDER_<any_subset_name>/
    └── images/
        ├── 0--label0/
        │   └── 0_label0_image1.jpg
        └── 1--label1/
            └── 1_label1_image2.jpg
```

## WIDER Face import

Uploaded file: a zip archive of the structure above

- supported annotations: Rectangles (with attributes), Labels
- supported attributes:
  - `blur`, `expression`, `illumination`, `occluded`, `pose`, `invalid`
