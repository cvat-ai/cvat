---
title: 'Market-1501'
linkTitle: 'Market-1501'
weight: 13
description: 'How to export and import data in Market-1501 format'
---

The Market-1501 dataset is widely used for person re-identification tasks.
It is a challenging dataset that has gained significant attention
in the computer vision community.

For more information, see:

- [Market-1501](https://www.aitribune.com/dataset/2018051063)
- [Dataset examples](https://github.com/cvat-ai/datumaro/tree/v0.3/tests/assets/market1501_dataset)

## Market-1501 export

For export of images:

- Supported annotations: Bounding Boxes
- Attributes: `query` (checkbox), `person_id` (number), `camera_id`(number).
- Tracks: Not supported.

Th downloaded file is a .zip archive with the following structure:

```bash
taskname.zip/
├── bounding_box_<any_subset_name>/
│   └── image_name_1.jpg
└── query
    ├── image_name_2.jpg
    └── image_name_3.jpg
# if we keep only annotation:
taskname.zip/
└── images_<any_subset_name>.txt
# images_<any_subset_name>.txt
query/image_name_1.jpg
bounding_box_<any_subset_name>/image_name_2.jpg
bounding_box_<any_subset_name>/image_name_3.jpg
# image_name = 0001_c1s1_000015_00.jpg
0001 - person id
c1 - camera id (there are totally 6 cameras)
s1 - sequence
000015 - frame number in sequence
00 - means that this bounding box is the first one among the several
```

## Market-1501 import

Uploaded file: a zip archive of the structure above

- supported annotations: Label `market-1501` with attributes (`query`, `person_id`, `camera_id`)
