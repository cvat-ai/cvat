---
title: 'MOT'
linkTitle: 'MOT'
weight: 3
description: 'How to export and import data in MOT format'
---

The MOT (Multiple Object Tracking) sequence format is widely
used for evaluating multi-object tracking algorithms, particularly in
the domains of pedestrian tracking, vehicle tracking, and more.
The MOT sequence format essentially contains frames of video
along with annotations that specify object locations and identities over time.

For more information, see:

- [MOT sequence paper](https://arxiv.org/pdf/1906.04567.pdf)
- [Dataset examples](https://github.com/cvat-ai/datumaro/tree/v0.3/tests/assets/mot_dataset)

## MOT export

For export of images and videos:

- Supported annotations: Bounding Boxes.
- Attributes: `visibility` (number), `ignored` (checkbox)
- Tracks: Supported.

The downloaded file is a .zip archive with the following structure:

```bash
taskname.zip/
├── img1/
|   ├── image1.jpg
|   └── image2.jpg
└── gt/
    ├── labels.txt
    └── gt.txt

# labels.txt
cat
dog
person
...

# gt.txt
# frame_id, track_id, x, y, w, h, "not ignored", class_id, visibility, <skipped>
1,1,1363,569,103,241,1,1,0.86014
...

```

## MOT import

Uploaded file: a zip archive of the structure above or:

```bash
archive.zip/
└── gt/
    └── gt.txt
    └── labels.txt # optional, mandatory for non-official labels
```

- supported annotations: Rectangle tracks
