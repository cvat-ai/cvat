---
linkTitle: 'Datumaro'
weight: 1.5
---

# Datumaro format

[Datumaro](https://github.com/openvinotoolkit/datumaro/) is a tool, which can
help with complex dataset and annotation transformations, format conversions,
dataset statistics, merging, custom formats etc. It is used as a provider
of dataset support in CVAT, so basically, everything possible in CVAT
is possible in Datumaro too, but Datumaro can offer dataset operations.

- supported annotations: any 2D shapes, labels
- supported attributes: any

# Import annotations in Datumaro format

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

# Export annotations in Datumaro format

Downloaded file: a zip archive of the following structure:

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
