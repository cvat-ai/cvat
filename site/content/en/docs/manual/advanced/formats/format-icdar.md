---
title: 'ICDAR13/15'
linkTitle: 'ICDAR13/15'
weight: 14
description: 'How to export and import data in ICDAR13/15 format'
---

ICDAR 13/15 formats are typically used for text detection and recognition tasks
and OCR (Optical Character Recognition).

These formats are usually paired with specialized text detection and recognition models.

For more information, see:

- [ICDAR13/15](https://rrc.cvc.uab.es/?ch=2)
- [Dataset examples](https://github.com/cvat-ai/datumaro/tree/v0.3/tests/assets/icdar_dataset)

## ICDAR13/15 export

For export of images:

- **ICDAR Recognition 1.0** (Text recognition):
  - Supported annotations: Tag `icdar`
  - Attributes: `caption`.
- **ICDAR Detection 1.0** (Text detection):
  - Supported annotations: Bounding Boxes, Polygons with lavel `icdar`
    added in constructor.
  - Attributes: `text`.
- **ICDAR Segmentation 1.0** (Text segmentation):
  - Supported annotations: Bounding Boxes, Polygons with label `icdar`
    added in constructor.
  - Attributes: `index`, `text`, `color`, `center`
- Tracks: Not supported.

The downloaded file is a .zip archive with the following structure:

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

Uploaded file: a zip archive of the structure above

**Word recognition task**:

- supported annotations: Label `icdar` with attribute `caption`

**Text localization task**:

- supported annotations: Rectangles and Polygons with label `icdar`
  and attribute `text`

**Text segmentation task**:

- supported annotations: Rectangles and Polygons with label `icdar`
  and attributes `index`, `text`, `color`, `center`
