---
title: 'ImageNet'
linkTitle: 'ImageNet'
weight: 9
description: 'How to export and import data in ImageNet format'
---

The ImageNet is typically used for a variety of computer vision tasks,
including but not limited to image classification, object detection,
and segmentation.

It is widely recognized and used in the training and
benchmarking of various machine learning models.

For more information, see:

- [ImageNet site](http://www.image-net.org)
- [Dataset examples](https://github.com/cvat-ai/datumaro/tree/v0.3/tests/assets/imagenet_dataset)

## ImageNet export

For export of images:

- Supported annotations: Tags.
- Attributes: Not supported.
- Tracks: Not supported.

The downloaded file is a .zip archive with the following structure:

```bash
# if we save images:
taskname.zip/
├── label1/
|   ├── label1_image1.jpg
|   └── label1_image2.jpg
└── label2/
    ├── label2_image1.jpg
    ├── label2_image3.jpg
    └── label2_image4.jpg

# if we keep only annotation:
taskname.zip/
├── <any_subset_name>.txt
└── synsets.txt

```

## ImageNet import

Uploaded file: a zip archive of the structure above

- supported annotations: Labels
