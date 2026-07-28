---
title: 'Datumaro'
linkTitle: 'Datumaro'
weight: 1.5
description: 'How to export and import data in Datumaro format'
aliases:
 - /docs/manual/advanced/formats/format-datumaro/
---

The Datumaro format is a universal format, capable of handling arbitrary datasets and annotations.
It is the native format of the Datumaro dataset framework.

The framework can be used for various dataset operations, such as dataset and annotation transformations, format
conversions, computation of statistics, and dataset merging.

This framework is used in CVAT as the dataset support provider.
It effectively means that anything you import in CVAT or export from CVAT,
can be processed with Datumaro, allowing you to perform custom dataset operations easily.

<iframe width="560" height="315" src="https://www.youtube.com/embed/GgKIEFhd1CY" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

For more information, see:

- [Datumaro project page](https://github.com/cvat-ai/datumaro/)
- [Dataset examples](https://github.com/cvat-ai/datumaro/tree/develop/tests/assets/datumaro_dataset)

## Datumaro export

- Supported annotations: Tags, Bounding Boxes, Oriented Bounding Boxes, Polygons,
  Polylines, Points, Cuboids, Ellipses, Masks, Skeletons.
- Attributes: Supported.
- Tracks: Supported (via the `track_id` attribute).

The downloaded file is a `.zip` archive with the following structure:

```bash
taskname.zip/
├── annotations/
│   └── default.json
└── images/
    └── default/
        ├── image1.jpg
        ├── image2.jpg
        ├── ...
```

## Datumaro import

- Supported annotations: Tags, Bounding Boxes, Polygons,
  Polylines, Points, Cuboids, Ellipses, Masks, Skeletons.
- Attributes: Supported.
- Tracks: Supported.

Uploaded file: a `.json` file with annotations or a `.zip` archive of the following structure:

```bash
archive.zip/
└── annotations/
    ├── subset1.json
    └── subset2.json
```

The `.json` annotations files in the `annotations` directory should have similar structure:

```json
{
  "info": {},
  "categories": {
    "label": {
      "labels": [
        {
          "name": "label_0",
          "parent": "",
          "attributes": []
        },
        {
          "name": "label_1",
          "parent": "",
          "attributes": []
        }
      ],
      "attributes": []
    }
  },
  "items": [
    {
      "id": "img1",
      "annotations": [
        {
          "id": 0,
          "type": "polygon",
          "attributes": {},
          "group": 0,
          "label_id": 1,
          "points": [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0],
          "z_order": 0
        },
        {
          "id": 1,
          "type": "bbox",
          "attributes": {},
          "group": 1,
          "label_id": 0,
          "z_order": 0,
          "bbox": [1.0, 2.0, 3.0, 4.0]
        },
        {
          "id": 2,
          "type": "mask",
          "attributes": {},
          "group": 1,
          "label_id": 0,
          "rle": {
            "counts": "d0d0:F\\0",
            "size": [10, 10]
          },
          "z_order": 0
        }
      ]
    }
  ]
}
```
