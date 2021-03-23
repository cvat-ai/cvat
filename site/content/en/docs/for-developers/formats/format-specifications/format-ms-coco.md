---
linkTitle: "MS COCO"
weight: 5
---

### [MS COCO Object Detection](http://cocodataset.org/#format-data)<a id="coco" />

- [Format specification](http://cocodataset.org/#format-data)

#### COCO dumper description

Downloaded file: single unpacked `json`.

- supported annotations: Polygons, Rectangles

#### COCO loader description

Uploaded file: single unpacked `*.json` .

- supported annotations: Polygons, Rectangles (if `segmentation` field is empty)

#### How to create a task from MS COCO dataset

1. Download the [MS COCO dataset](http://cocodataset.org/#download).

   For example [2017 Val images](http://images.cocodataset.org/zips/val2017.zip)
   and [2017 Train/Val annotations](http://images.cocodataset.org/annotations/annotations_trainval2017.zip).

1. Create a CVAT task with the following labels:

   ``` bash
   person bicycle car motorcycle airplane bus train truck boat "traffic light" "fire hydrant" "stop sign" "parking meter" bench bird cat dog horse sheep cow elephant bear zebra giraffe backpack umbrella handbag tie suitcase frisbee skis snowboard "sports ball" kite "baseball bat" "baseball glove" skateboard surfboard "tennis racket" bottle "wine glass" cup fork knife spoon bowl banana apple sandwich orange broccoli carrot "hot dog" pizza donut cake chair couch "potted plant" bed "dining table" toilet tv laptop mouse remote keyboard "cell phone" microwave oven toaster sink refrigerator book clock vase scissors "teddy bear" "hair drier" toothbrush
   ```

1. Select val2017.zip as data
   (See [Creating an annotation task](/docs/for-users/user-guide/creating_an_annotation_task)
   guide for details)

1. Unpack `annotations_trainval2017.zip`

1. click `Upload annotation` button,
   choose `COCO 1.1` and select `instances_val2017.json.json`
   annotation file. It can take some time.
