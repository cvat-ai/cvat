---
title: 'YOLOv8'
linkTitle: 'YOLOv8'
weight: 7
description: 'How to export and import data in YOLOv8 formats'
---

YOLOv8 is a format family which consists of four formats:
- [Detection](https://docs.ultralytics.com/datasets/detect/)
- [Oriented bounding Box](https://docs.ultralytics.com/datasets/obb/)
- [Segmentation](https://docs.ultralytics.com/datasets/segment/)
- [Pose](https://docs.ultralytics.com/datasets/pose/)

Dataset examples:
- [Detection](https://github.com/cvat-ai/datumaro/tree/develop/tests/assets/yolo_dataset/yolov8_detection)
- [Oriented Bounding Boxes](https://github.com/cvat-ai/datumaro/tree/develop/tests/assets/yolo_dataset/yolov8_oriented_boxes)
- [Segmentation](https://github.com/cvat-ai/datumaro/tree/develop/tests/assets/yolo_dataset/yolov8_segmentation)
- [Pose](https://github.com/cvat-ai/datumaro/tree/develop/tests/assets/yolo_dataset/yolov8_pose)


## YOLOv8 export

For export of images:

- Supported annotations
  - Detection: Bounding Boxes
  - Oriented bounding box: Oriented Bounding Boxes
  - Segmentation: Polygons, Masks
  - Pose: Skeletons
- Attributes: Not supported.
- Tracks: Not supported.

The downloaded file is a .zip archive with the following structure:

```bash
archive.zip/
   ├── data.yaml  # configuration file
   ├── train.txt  # list of train subset image paths
   │
   ├── images/
   │   ├── train/  # directory with images for train subset
   │   │    ├── image1.jpg
   │   │    ├── image2.jpg
   │   │    ├── image3.jpg
   │   │    └── ...
   ├── labels/
   │   ├── train/  # directory with annotations for train subset
   │   │    ├── image1.txt
   │   │    ├── image2.txt
   │   │    ├── image3.txt
   │   │    └── ...

# train.txt:
images/<subset>/image1.jpg
images/<subset>/image2.jpg
...

# data.yaml:
path:  ./ # dataset root dir
train: train.txt  # train images (relative to 'path')

# YOLOv8 Pose specific field
# First number is the number of points in a skeleton.
# If there are several skeletons with different number of points, it is the greatest number of points
# Second number defines the format of point info in annotation txt files
kpt_shape: [17, 3]

# Classes
names:
  0: person
  1: bicycle
  2: car
  # ...

# <image_name>.txt:
# content depends on format

# YOLOv8 Detection:
# label_id - id from names field of data.yaml
# cx, cy - relative coordinates of the bbox center
# rw, rh - relative size of the bbox
# label_id cx cy rw rh
1 0.3 0.8 0.1 0.3
2 0.7 0.2 0.3 0.1

# YOLOv8 Oriented Bounding Boxes:
# xn, yn - relative coordinates of the n-th point
# label_id x1 y1 x2 y2 x3 y3 x4 y4
1 0.3 0.8 0.1 0.3 0.4 0.5 0.7 0.5
2 0.7 0.2 0.3 0.1 0.4 0.5 0.5 0.6

# YOLOv8 Segmentation:
# xn, yn - relative coordinates of the n-th point
# label_id x1 y1 x2 y2 x3 y3 ...
1 0.3 0.8 0.1 0.3 0.4 0.5
2 0.7 0.2 0.3 0.1 0.4 0.5 0.5 0.6 0.7 0.5

# YOLOv8 Pose:
# cx, cy - relative coordinates of the bbox center
# rw, rh - relative size of the bbox
# xn, yn - relative coordinates of the n-th point
# vn - visibility of n-th point. 2 - visible, 1 - partially visible, 0 - not visible
# if second value in kpt_shape is 3:
# label_id cx cy rw rh x1 y1 v1 x2 y2 v2 x3 y3 v3 ...
1 0.3 0.8 0.1 0.3 0.3 0.8 2 0.1 0.3 2 0.4 0.5 2 0.0 0.0 0 0.0 0.0 0
2 0.3 0.8 0.1 0.3 0.7 0.2 2 0.3 0.1 1 0.4 0.5 0 0.5 0.6 2 0.7 0.5 2

# if second value in kpt_shape is 2:
# label_id cx cy rw rh x1 y1 x2 y2 x3 y3 ...
1 0.3 0.8 0.1 0.3 0.3 0.8 0.1 0.3 0.4 0.5 0.0 0.0 0.0 0.0
2 0.3 0.8 0.1 0.3 0.7 0.2 0.3 0.1 0.4 0.5 0.5 0.6 0.7 0.5

# Note, that if there are several skeletons with different number of points,
# smaller skeletons are padded with points with coordinates 0.0 0.0 and visibility = 0
```

All coordinates must be normalized.
It can be achieved by dividing x coordinates and widths by image width,
and y coordinates and heights by image height.
> Note, that in CVAT you can place an object or some parts of it outside the image,
> which will cause the coordinates to be outside the \[0, 1\] range.
> YOLOv8 framework ignores labels with such coordinates.

Each annotation file, with the `.txt` extension,
is named to correspond with its associated image file.

For example, `frame_000001.txt` serves as the annotation for the
`frame_000001.jpg` image.
