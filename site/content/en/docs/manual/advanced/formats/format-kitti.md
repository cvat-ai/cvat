---
title: 'KITTI'
linkTitle: 'KITTI'
weight: 17
description: 'How to export and import data in KITTI format'
---

The KITTI format is widely used for a range of computer
vision tasks related to autonomous driving, including
but not limited to 3D object detection, multi-object tracking,
and scene flow estimation. Given its special focus on
automotive scenes, the KITTI format is generally
used with models that are designed or adapted for these types of tasks.

For more information, see:

- [KITTI site](http://www.cvlibs.net/datasets/kitti/)
- [Format specification for KITTI detection](https://s3.eu-central-1.amazonaws.com/avg-kitti/devkit_object.zip)
- [Format specification for KITTI segmentation](https://s3.eu-central-1.amazonaws.com/avg-kitti/devkit_semantics.zip)
- [Dataset examples](https://github.com/cvat-ai/datumaro/tree/v0.3/tests/assets/kitti_dataset)

## KITTI annotations export

For export of images:

- Supported annotations: Bounding Boxes (detection), Polygons (segmentation).
- Supported attributes:
  - `occluded` (Available both as a UI option and a separate attribute)
    Denotes that a major portion of the object within
    the bounding box is obstructed by another object.
  - `truncated` (Only applicable to bounding boxes)
    Must be represented as `checkboxes` for labels.
    Suggests that the bounding box does not
    encompass the entire object; some part is cut off.
  - `is_crowd` (Only valid for polygons). Should be indicated
    using `checkboxes` for labels.
    Signifies that the annotation encapsulates
    multiple instances of the same object class.
- Tracks: Not supported.

The downloaded file is a .zip archive with the following structure:

```
└─ annotations.zip/
    ├── label_colors.txt # list of pairs r g b label_name
    ├── labels.txt # list of labels
    └── default/
        ├── label_2/ # left color camera label files
        │   ├── <image_name_1>.txt
        │   ├── <image_name_2>.txt
        │   └── ...
        ├── instance/ # instance segmentation masks
        │   ├── <image_name_1>.png
        │   ├── <image_name_2>.png
        │   └── ...
        ├── semantic/ # semantic segmentation masks (labels are encoded by its id)
        │   ├── <image_name_1>.png
        │   ├── <image_name_2>.png
        │   └── ...
        └── semantic_rgb/ # semantic segmentation masks (labels are encoded by its color)
            ├── <image_name_1>.png
            ├── <image_name_2>.png
            └── ...
```

## KITTI annotations import

You can upload KITTI annotations in two ways:
rectangles for the detection task and
masks for the segmentation task.

For detection tasks the uploading archive should have the following structure:

```
└─ annotations.zip/
    ├── labels.txt # optional, labels list for non-original detection labels
    └── <subset_name>/
        ├── label_2/ # left color camera label files
        │   ├── <image_name_1>.txt
        │   ├── <image_name_2>.txt
        │   └── ...
```

For segmentation tasks the uploading archive should have the following structure:

```
└─ annotations.zip/
    ├── label_colors.txt # optional, color map for non-original segmentation labels
    └── <subset_name>/
        ├── instance/ # instance segmentation masks
        │   ├── <image_name_1>.png
        │   ├── <image_name_2>.png
        │   └── ...
        ├── semantic/ # optional, semantic segmentation masks (labels are encoded by its id)
        │   ├── <image_name_1>.png
        │   ├── <image_name_2>.png
        │   └── ...
        └── semantic_rgb/ # optional, semantic segmentation masks (labels are encoded by its color)
            ├── <image_name_1>.png
            ├── <image_name_2>.png
            └── ...
```

All annotation files and masks should have structures
that are described in the original format specification.
