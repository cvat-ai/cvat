---
title: 'COCO Keypoints'
linkTitle: 'COCO Keypoints'
weight: 5
description: 'How to export and import data in COCO Keypoints format'
aliases:
 - /docs/manual/advanced/formats/coco-keypoints/
 - /docs/manual/advanced/formats/format-coco-keypoints/
---

The COCO Keypoints format is designed specifically for human pose estimation tasks,
where the objective is to identify and localize body joints or keypoints on
a human figure within an image.
This format is used with a variety of state-of-the-art models focused on pose estimation.

For more information, see:

- [COCO Keypoint homepage](https://cocodataset.org/#keypoints-2020)
- [Format specification](https://open-edge-platform.github.io/datumaro/latest/docs/data-formats/formats/coco.html)
- [Example of the archive](https://open-edge-platform.github.io/datumaro/latest/docs/data-formats/formats/coco.html#import-coco-dataset)

## COCO Keypoints export

- Supported annotations: Skeletons
- Attributes: Supported (stored in the custom `attributes` field of the annotation).
- Tracks: Supported (via the `track_id` custom attribute).

Downloaded file is a `.zip` archive with the following structure:

```
├── images/
│   └── <subset_name>/
│       ├── <image_name1.ext>
│       ├── <image_name2.ext>
│       └── ...
└── annotations/
   ├── person_keypoints_<subset_name>.json
   └── ...
```

## COCO Keypoints import

- Supported annotations: Skeletons
- Attributes: Supported (via the custom `attributes` field of the annotation).
- Tracks: Supported (via the `track_id` custom attribute).

Uploaded file: a single unpacked `.json` or a `.zip` archive with the structure described above or
[here](https://open-edge-platform.github.io/datumaro/latest/docs/data-formats/formats/coco.html#import-coco-dataset)
(without images).
