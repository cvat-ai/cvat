---
linkTitle: 'KITTI'
weight: 17
---

# [KITTI](http://www.cvlibs.net/datasets/kitti/)

- [Format specification for KITTI detection](https://s3.eu-central-1.amazonaws.com/avg-kitti/devkit_object.zip)
- [Format specification for KITTI segmentation](https://s3.eu-central-1.amazonaws.com/avg-kitti/devkit_semantics.zip)

- supported annotations:

  - Rectangles (detection task)
  - Polygon (segmentation task)

- supported attributes:

  - `occluded` (both UI option and a separate attribute).
    Indicates that a significant portion of the object within
    the bounding box is occluded by another object
  - `truncated` supported only for rectangles
    (should be defined for labels as `checkbox` -es).
    Indicates that the bounding box specified for the object
    does not correspond to the full extent of the object
  - 'is_crowd' supported only for polygons
    (should be defined for labels as `checkbox` -es).
    Indicates that the annotation covers multiple instances of the same class

## KITTI annotations export

Downloaded file: a zip archive of the following structure:

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
