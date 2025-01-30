---
title: 'Datumaro'
linkTitle: 'Datumaro'
weight: 1.5
description: 'How to export and import data in Datumaro format'
---

Datumaro serves as a versatile format capable of handling complex
dataset and annotation transformations,
format conversions, dataset statistics, and merging, among other features.
It functions as the dataset support provider within CVAT.
Essentially, anything you can do in CVAT, you can also achieve
in Datumaro, but with the added benefit of specialized dataset operations.

For more information, see:

- [Datumaro specification](https://github.com/cvat-ai/datumaro/)

# Export annotations in Datumaro format

For export of images: any 2D shapes, tags

- Supported annotations: Bounding Boxes, Polygons,
Polylines, Points, Cuboids, Tags, Ellipses, Masks, Skeletons.
- Attributes: Supported.
- Tracks: Supported.

The downloaded file is a zip archive with the following structure:

```bash
taskname.zip/
├── annotations/
│   └── default.json # fully description of classes and all dataset items
└── images/ # if the option `save images` was selected
    └── default
        ├── image1.jpg
        ├── image2.jpg
        ├── ...
```

# Import annotations in Datumaro format

- supported annotations: Bounding Boxes, Polygons, Polylines,
  Masks, Points, Cuboids, Labels, Skeletons
- supported attributes: any

Uploaded file: a zip archive of the following structure:

```bash
<archive_name>.zip/
└── annotations/
    ├── subset1.json # fully description of classes and all dataset items
    └── subset2.json # fully description of classes and all dataset items
```

JSON annotations files in the `annotations` directory should have similar structure:

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
