---
linkTitle: 'MS COCO'
weight: 5
---

# [MS COCO Object Detection](http://cocodataset.org/#format-data)

- [Format specification](https://openvinotoolkit.github.io/datumaro/docs/formats/coco/)

## COCO export

Downloaded file: a zip archive with the structure described [here](https://openvinotoolkit.github.io/datumaro/docs/formats/coco/#import-coco-dataset)

- supported annotations: Polygons, Rectangles
- supported attributes:
  - `is_crowd` (checkbox or integer with values 0 and 1) -
    specifies that the instance (an object group) should have an
    RLE-encoded mask in the `segmentation` field. All the grouped shapes
    are merged into a single mask, the largest one defines all
    the object properties
  - `score` (number) - the annotation `score` field
  - arbitrary attributes - will be stored in the `attributes` annotation section

Support for COCO tasks via Datumaro is described [here](https://openvinotoolkit.github.io/datumaro/docs/formats/coco/#export-to-other-formats)
For example, [support for COCO keypoints over Datumaro](https://github.com/openvinotoolkit/cvat/issues/2910#issuecomment-726077582):

1. Install [Datumaro](https://github.com/openvinotoolkit/datumaro)
   `pip install datumaro`
2. Export the task in the `Datumaro` format, unzip
3. Export the Datumaro project in `coco` / `coco_person_keypoints` formats
   `datum export -f coco -p path/to/project [-- --save-images]`

This way, one can export CVAT points as single keypoints or
keypoint lists (without the `visibility` COCO flag).

## COCO import

Uploaded file: a single unpacked `*.json` or a zip archive with the structure described
[here](https://openvinotoolkit.github.io/datumaro/docs/formats/coco/#import-coco-dataset)
(without images).

- supported annotations: Polygons, Rectangles (if the `segmentation` field is empty)

## How to create a task from MS COCO dataset

1. Download the [MS COCO dataset](https://openvinotoolkit.github.io/datumaro/docs/formats/coco/#import-coco-dataset).

   For example `val images` and `instances` annotations

2. Create a CVAT task with the following labels:

   ```bash
   person bicycle car motorcycle airplane bus train truck boat "traffic light" "fire hydrant" "stop sign" "parking meter" bench bird cat dog horse sheep cow elephant bear zebra giraffe backpack umbrella handbag tie suitcase frisbee skis snowboard "sports ball" kite "baseball bat" "baseball glove" skateboard surfboard "tennis racket" bottle "wine glass" cup fork knife spoon bowl banana apple sandwich orange broccoli carrot "hot dog" pizza donut cake chair couch "potted plant" bed "dining table" toilet tv laptop mouse remote keyboard "cell phone" microwave oven toaster sink refrigerator book clock vase scissors "teddy bear" "hair drier" toothbrush
   ```

3. Select `val2017.zip` as data
   (See [Creating an annotation task](/docs/manual/basics/creating_an_annotation_task/)
   guide for details)

4. Unpack `annotations_trainval2017.zip`

5. click `Upload annotation` button,
   choose `COCO 1.1` and select `instances_val2017.json`
   annotation file. It can take some time.
