---
title: 'COCO'
linkTitle: 'COCO'
weight: 5
description: 'How to export and import data in COCO format'
aliases:
 - /docs/manual/advanced/formats/format-coco/
---

The COCO dataset format is a popular format, designed
for tasks involving object detection and instance segmentation.
It's supported by many annotation tools and model training frameworks,
making it a safe default choice for typical object detection projects.

For more information, see:

- [COCO format homepage](http://cocodataset.org/#format-data)
- [Format specification](https://open-edge-platform.github.io/datumaro/stable/docs/data-formats/formats/coco.html)
- [Dataset examples](https://github.com/cvat-ai/datumaro/tree/v0.3/tests/assets/coco_dataset)

## COCO export

- Supported annotations: Bounding Boxes, Oriented Bounding Boxes, Polygons, Masks, Ellipses (as masks).
- Attributes:
  - `is_crowd` This can either be a checkbox or an integer
    (with values of 0 or 1). It indicates whether the instance
    (a group of objects) should be represented as an RLE-encoded mask or a set of polygons
    in the `segmentation` field of the annotation file.
    The largest (by area) shape in the group sets the properties for the entire object group.
    If the attribute is not specified, the input shape type is used (polygon or mask).
    If `True` or 1, all shapes within the group will be converted into a single mask.
    If `False` or 0, all shapes within the group will be converted into polygons.
  - Arbitrary attributes: These will be stored within the custom `attributes`
    section of the annotation.
- Tracks: Supported (via the `track_id` custom attribute).

The downloaded file is a `.zip` archive with the following structure:

```
taskname.zip/
├── images/
│   └── <subset_name>/
│       ├── <image_name1.ext>
│       ├── <image_name2.ext>
│       └── ...
└── annotations/
   ├── instances_<subset_name>.json
   └── ...
```

When exporting a dataset from a Project, subset names will mirror those used within the project itself.
Otherwise, a singular default subset will be created to house all the dataset information.

## COCO import

- Supported annotations: Bounding Boxes (if the `segmentation` field is empty), Polygons, Masks.
- Attributes: Supported, as described in the export section
- Tracks: Supported (via the `track_id` custom attribute).
- Supported tasks: `instances`, `person_keypoints` (only segmentations will be imported), `panoptic`.

Upload format: a `.json` file with annotations
or a `.zip` archive with the structure described above or
[here](https://open-edge-platform.github.io/datumaro/latest/docs/data-formats/formats/coco.html#import-coco-dataset)
(without images).

{{% alert title="Note" color="primary" %}}
Even though `licenses` and `info` fields are required according to format specifications,
CVAT does not require them to import annotations.
{{% /alert %}}


## How to create a task from MS COCO dataset

1. Download the [MS COCO dataset](https://open-edge-platform.github.io/datumaro/latest/docs/data-formats/formats/coco.html#import-coco-dataset).

   For example `val images` and `instances` annotations

2. Create a CVAT task with the following labels:

   ```bash
   person bicycle car motorcycle airplane bus train truck boat "traffic light" "fire hydrant" "stop sign" "parking meter" bench bird cat dog horse sheep cow elephant bear zebra giraffe backpack umbrella handbag tie suitcase frisbee skis snowboard "sports ball" kite "baseball bat" "baseball glove" skateboard surfboard "tennis racket" bottle "wine glass" cup fork knife spoon bowl banana apple sandwich orange broccoli carrot "hot dog" pizza donut cake chair couch "potted plant" bed "dining table" toilet tv laptop mouse remote keyboard "cell phone" microwave oven toaster sink refrigerator book clock vase scissors "teddy bear" "hair drier" toothbrush
   ```

3. Select `val2017.zip` as data
   (See {{< ilink "/docs/workspace/tasks-page#create-annotation-task" "Creating an annotation task" >}}
   guide for details)

4. Unpack `annotations_trainval2017.zip`

5. click `Upload annotation` button,
   choose `COCO 1.1` and select `instances_val2017.json`
   annotation file. It can take some time.
