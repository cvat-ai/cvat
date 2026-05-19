---
title: 'ICDAR13/15'
linkTitle: 'ICDAR13/15'
weight: 14
description: 'How to export and import data in ICDAR13/15 format'
aliases:
 - /docs/manual/advanced/formats/format-icdar/
---

ICDAR 13/15 formats are typically used for text detection and recognition tasks
and OCR (Optical Character Recognition).

These formats are usually paired with specialized text detection and recognition models.

For more information, see:

- [ICDAR13/15](https://rrc.cvc.uab.es/?ch=2)
- [Dataset examples](https://github.com/cvat-ai/datumaro/tree/v0.3/tests/assets/icdar_dataset)

## ICDAR13/15 export

- **ICDAR Recognition 1.0** (Text recognition):
  - Supported annotations: Tags with the `icdar` label
  - Attributes: `caption`.
- **ICDAR Detection 1.0** (Text detection):
  - Supported annotations: Bounding Boxes, Polygons with the `icdar` label
  - Attributes: `text`.
- **ICDAR Segmentation 1.0** (Text segmentation):
  - Supported annotations: Masks, Bounding Boxes, Polygons, or Ellipses with the `icdar` label
  - Attributes: `index`, `text`, `color`, `center`
- Tracks: Not supported.

The downloaded file is a `.zip` archive with the following structure:

```bash
# text recognition task
taskname.zip/
└── word_recognition/
    └── <any_subset_name>/
        ├── images
        |   ├── word1.png
        |   └── word2.png
        └── gt.txt
# text localization task
taskname.zip/
└── text_localization/
    └── <any_subset_name>/
        ├── images
        |   ├── img_1.png
        |   └── img_2.png
        ├── gt_img_1.txt
        └── gt_img_1.txt
#text segmentation task
taskname.zip/
└── text_localization/
    └── <any_subset_name>/
        ├── images
        |   ├── 1.png
        |   └── 2.png
        ├── 1_GT.bmp
        ├── 1_GT.txt
        ├── 2_GT.bmp
        └── 2_GT.txt
```

## ICDAR13/15 import

**Word recognition task**:

- Supported annotations: Tags with the `icdar` label and `caption` attribute

**Text localization task**:

- Supported annotations: Rectangles and Polygons with the `icdar` label
  and `text` attribute

**Text segmentation task**:

- Supported annotations: Masks or Polygons with the `icdar` label
  and `index`, `text`, `color`, `center` attributes

Uploaded file: a `.zip` archive of the structure above
