---
title: 'Ultralytics-YOLO-Classification'
linkTitle: 'Ultralytics-YOLO-Classification'
weight: 7
description: 'How to export and import data in Ultralytics YOLO Classification format'
---

For more information, see:

- [Format specification](https://docs.ultralytics.com/datasets/classify/)
- [Dataset examples](https://github.com/cvat-ai/datumaro/tree/develop/tests/assets/yolo_dataset/yolo_ultralytics_classification)

## Ultralytics YOLO Classification export

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
