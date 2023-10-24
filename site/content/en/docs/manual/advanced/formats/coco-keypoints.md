---
title: 'COCO Keypoints'
linkTitle: 'COCO Keypoints'
weight: 5
description: 'How to export and import data in COCO Keypoints format'
---

The COCO Keypoints format is designed specifically for human pose estimation tasks, where the objective
is to identify and localize body joints (keypoints) on a human figure within an image.

This specialized format is used with a variety of state-of-the-art models focused on pose estimation.

For more information, see:

- [COCO Keypoint site](https://cocodataset.org/#keypoints-2020)
- [Format specification](https://openvinotoolkit.github.io/datumaro/latest/docs/data-formats/formats/coco.html)
- [Example of the archive](https://openvinotoolkit.github.io/datumaro/latest/docs/data-formats/formats/coco.html#import-coco-dataset)

## COCO Keypoints export

For export of images:

- Supported annotations: Skeletons
- Attributes:
  - `is_crowd` This can either be a checkbox or an integer
    (with values of 0 or 1). It indicates that the instance
    (or group of objects) should include an RLE-encoded mask in the `segmentation` field.
    All shapes within the group coalesce into a single, overarching mask,
    with the largest shape setting the properties for the entire object group.
  - `score`: This numerical field represents the annotation `score`.
  - Arbitrary attributes: These will be stored within the `attributes`
    section of the annotation.
- Tracks: Not supported.

Downloaded file is a .zip archive with the following structure:

```
archive.zip/
├── images/
│
│   ├── <image_name1.ext>
│   ├── <image_name2.ext>
│   └── ...
├──<annotations>.xml
```

## COCO import

Uploaded file: a single unpacked `*.json` or a zip archive with the structure described
[here](https://openvinotoolkit.github.io/datumaro/latest/docs/data-formats/formats/coco.html#import-coco-dataset)
(without images).

- supported annotations: Skeletons

`person_keypoints`,

Support for COCO tasks via Datumaro is described [here](https://openvinotoolkit.github.io/datumaro/latest/docs/data-formats/formats/coco.html#export-to-other-formats)
For example, [support for COCO keypoints over Datumaro](https://github.com/openvinotoolkit/cvat/issues/2910#issuecomment-726077582):

1. Install [Datumaro](https://github.com/openvinotoolkit/datumaro)
   `pip install datumaro`
2. Export the task in the `Datumaro` format, unzip
3. Export the Datumaro project in `coco` / `coco_person_keypoints` formats
   `datum export -f coco -p path/to/project [-- --save-images]`

This way, one can export CVAT points as single keypoints or
keypoint lists (without the `visibility` COCO flag).
