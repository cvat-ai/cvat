---
title: 'LabelMe'
linkTitle: 'LabelMe'
weight: 2
description: 'How to export and import data in LabelMe format'
---

The LabelMe format is often used for image segmentation tasks in computer vision.
While it may not be specifically tied to any particular models,
it's designed to be versatile and can be easily converted to formats
that are compatible with popular frameworks like TensorFlow or PyTorch.

For more information, see:

- [LabelMe](http://labelme.csail.mit.edu/Release3.0)
- [Dataset examples](https://github.com/cvat-ai/datumaro/tree/v0.3/tests/assets/labelme_dataset)

## LabelMe export

For export of images:

- Supported annotations: Bounding Boxes, Polygons.
- Attributes: Supported for Polygons.
- Tracks: Not supported.

The downloaded file is a .zip archive with the following structure:

```bash
taskname.zip/
├── img1.jpg
└── img1.xml
```

## LabelMe import

Uploaded file: a zip archive of the following structure:

```bash
taskname.zip/
├── Masks/
|   ├── img1_mask1.png
|   └── img1_mask2.png
├── img1.xml
├── img2.xml
└── img3.xml
```

- supported annotations: Rectangles, Polygons, Masks (as polygons)
