---
title: 'CVAT for image'
linkTitle: 'CVAT for image'
weight: 1
description: 'How to export and import data in CVAT for image format'
aliases:
 - /docs/manual/advanced/formats/format-cvat/
---

This is CVAT's native annotation format,
which fully supports all of CVAT's annotation features.
It is ideal for creating data backups.

For more information, see:

- {{< ilink "/docs/other/xml_format" "Format specification" >}}
- [Dataset examples](https://github.com/cvat-ai/datumaro/tree/v0.3/tests/assets/cvat_dataset)

## CVAT for image export

 Applicable for all computer vision tasks in
 2D except for Video Tracking.

- Supported annotations: Tags, Bounding Boxes, Polygons, Polylines,
  Points, Cuboids, Ellipses, Skeletons, Masks.
- Attributes: Supported.
- Tracks: Supported (via the extra `track_id` attribute).

The downloaded file is a `.zip` archive with following structure:

```bash
taskname.zip/
├── images/
|   ├── img1.png
|   └── img2.jpg
└── annotations.xml
```

## CVAT for video export

Applicable for all computer vision tasks
in 2D except for Classification

- Supported annotations: Bounding Boxes, Polygons, Polylines,
  Points, Cuboids, Ellipses, Skeletons, Masks.
- Attributes: Supported.
- Tracks: Supported.
- Shapes are exported as single-frame tracks

Downloaded file is a `.zip` archive with following structure:

```bash
taskname.zip/
├── images/
|   ├── frame_000000.png
|   └── frame_000001.png
└── annotations.xml
```

## CVAT for video import

Uploaded file: either an `.xml` file or a
`.zip` file with the contents described above.
