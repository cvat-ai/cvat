---
title: 'MOTS'
linkTitle: 'MOTS'
weight: 4
description: 'How to export and import data in MOTS format'
aliases:
 - /docs/manual/advanced/formats/format-mots/
---

The MOT (Multiple Object Tracking) sequence format is widely
used for evaluating multi-object tracking algorithms, particularly in
the domains of pedestrian tracking, vehicle tracking, and more.
The MOT sequence format essentially contains frames of video
along with annotations that specify object locations and identities over time.

This version encoded as .png. Supports masks.

For more information, see:

- [MOTS PNG Specification](https://www.vision.rwth-aachen.de/page/mots)
- [Dataset examples](https://github.com/cvat-ai/datumaro/tree/v0.3/tests/assets/mots_dataset)

## MOTS PNG export

For export of images and videos:

- Supported annotations: Masks, Bounding Boxes (as masks), Polygons (as masks), Ellipses (as masks).
- Attributes: `visibility` (number), `ignored` (checkbox).
- Tracks: Supported. Only tracks are supported, shapes are ignored.

The downloaded file is a `.zip` archive with the following structure:

```bash
taskname.zip/
└── <any_subset_name>/
    |   images/
    |   ├── image1.jpg
    |   └── image2.jpg
    └── instances/
        ├── labels.txt
        ├── image1.png
        └── image2.png

# labels.txt
cat
dog
person
...
```

## MOTS PNG import

- Supported annotations: Masks or Polygon tracks

Uploaded file: a `.zip` archive of the structure above

