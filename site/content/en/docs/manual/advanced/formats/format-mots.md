---
title: 'MOTS'
linkTitle: 'MOTS'
weight: 4
description: 'How to export and import data in MOTS format'
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

- Supported annotations: Bounding Boxes, Masks
- Attributes: `visibility` (number), `ignored` (checkbox).
- Tracks: Supported.

The downloaded file is a .zip archive with the following structure:

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

- supported annotations: Rectangle and Polygon tracks

## MOTS PNG import

Uploaded file: a zip archive of the structure above

- supported annotations: Polygon tracks
