---
title: 'COCO'
linkTitle: 'COCO'
weight: 5
description: 'How to export and import data in COCO format'
---

A widely-used machine learning structure, the COCO dataset is instrumental
for tasks involving object identification and image segmentation.
This format is compatible with projects that employ bounding boxes or
polygonal image annotations.

For more information, see:

- [COCO Object Detection site](http://cocodataset.org/#format-data)
- [Format specification](https://openvinotoolkit.github.io/datumaro/stable/docs/data-formats/formats/coco.html)
- [Dataset examples](https://github.com/cvat-ai/datumaro/tree/v0.3/tests/assets/coco_dataset)

## COCO export

For export of images and videos:

- Supported annotations: Bounding Boxes, Polygons.
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

The downloaded file is a .zip archive with the following structure:

```
archive.zip/
├── images/
│   ├── train/
│   │   ├── <image_name1.ext>
│   │   ├── <image_name2.ext>
│   │   └── ...
│   └── val/
│       ├── <image_name1.ext>
│       ├── <image_name2.ext>
│       └── ...
└── annotations/
   ├── <task>_<subset_name>.json
   └── ...
```

When exporting a dataset from a Project, subset names will mirror those used within the project itself.
Otherwise, a singular default subset will be created to house all the dataset information.
The <task> section aligns with one of the specific COCO tasks,
such as `instances`, `panoptic`, `image_info`, `labels`, `captions`, or `stuff`.

## COCO import

Upload format: a single unpacked `*.json` or a zip archive with the structure described above or
[here](https://openvinotoolkit.github.io/datumaro/latest/docs/data-formats/formats/coco.html#import-coco-dataset)
(without images).

- supported annotations: Polygons, Rectangles (if the `segmentation` field is empty)
- supported tasks: `instances`, `person_keypoints` (only segmentations will be imported), `panoptic`

## How to create a task from MS COCO dataset

1. Download the [MS COCO dataset](https://openvinotoolkit.github.io/datumaro/latest/docs/data-formats/formats/coco.html#import-coco-dataset).

   For example `val images` and `instances` annotations

2. Create a CVAT task with the following labels:

   ```bash
   person bicycle car motorcycle airplane bus train truck boat "traffic light" "fire hydrant" "stop sign" "parking meter" bench bird cat dog horse sheep cow elephant bear zebra giraffe backpack umbrella handbag tie suitcase frisbee skis snowboard "sports ball" kite "baseball bat" "baseball glove" skateboard surfboard "tennis racket" bottle "wine glass" cup fork knife spoon bowl banana apple sandwich orange broccoli carrot "hot dog" pizza donut cake chair couch "potted plant" bed "dining table" toilet tv laptop mouse remote keyboard "cell phone" microwave oven toaster sink refrigerator book clock vase scissors "teddy bear" "hair drier" toothbrush
   ```

3. Select `val2017.zip` as data
   (See {{< ilink "/docs/manual/basics/create_an_annotation_task" "Creating an annotation task" >}}
   guide for details)

4. Unpack `annotations_trainval2017.zip`

5. click `Upload annotation` button,
   choose `COCO 1.1` and select `instances_val2017.json`
   annotation file. It can take some time.
