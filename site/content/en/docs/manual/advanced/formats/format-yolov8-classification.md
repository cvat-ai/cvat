---
title: 'YOLOv8-Classification'
linkTitle: 'YOLOv8-Classification'
weight: 7
description: 'How to export and import data in YOLOv8 Classification format'
---

For more information, see:

- [Format specification](https://docs.ultralytics.com/datasets/classify/)
- [Dataset examples](https://github.com/cvat-ai/datumaro/tree/develop/tests/assets/yolo_dataset/yolov8_classification)

## YOLOv8 Classification export

For export of images:

- Supported annotations: Tags.
- Attributes: Not supported.
- Tracks: Not supported.

The downloaded file is a .zip archive with the following structure:

```bash
archive.zip/
├── train
│    ├── labels.json  # CVAT extension. Contains original ids and labels
│    │                # is not needed when using dataset with YOLOv8 framework
│    │                # but is useful when importing it back to CVAT
│    ├── label_0
│    │      ├── <image_name_0>.jpg
│    │      ├── <image_name_1>.jpg
│    │      ├── <image_name_2>.jpg
│    │      ├── ...
│    ├── label_1
│    │      ├── <image_name_0>.jpg
│    │      ├── <image_name_1>.jpg
│    │      ├── <image_name_2>.jpg
│    │      ├── ...
├── ...
```
