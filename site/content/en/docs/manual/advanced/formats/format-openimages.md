---
title: 'Open Images'
linkTitle: 'Open Images'
weight: 15
description: 'How to export and import data in Open Images format'
---

The Open Images format is based on a large-scale, diverse dataset
that contains object detection, object segmentation, visual relationship,
and localized narratives annotations.

Its export data format is compatible with many object detection and segmentation models.

For more information, see:

- [Open Images site](https://storage.googleapis.com/openimages/web/index.html)
- [Format specification](https://storage.googleapis.com/openimages/web/download.html)
- [Dataset examples](https://github.com/cvat-ai/datumaro/tree/v0.3/tests/assets/open_images_dataset)

## Open Images export

For export of images:

- Supported annotations: Bounding Boxes (detection),
  Tags (classification), Polygons (segmentation).

- Supported attributes:
  - Tags: `score` must be defined for labels as `text` or `number`.
    The confidence level from 0 to 1.
  - Bounding boxes: <br>`score` must be defined for labels as `text` or `number`.
    The confidence level from 0 to 1. <br> `occluded` as both UI option
    and a separate attribute. Whether the object is occluded by another object. <br>`truncated`
    must be defined for labels as `checkbox`. Whether the object extends beyond the boundary of the image.
    <br>`is_group_of` must be defined for labels as `checkbox`. Whether the object
    represents a group of objects of the same class. <br>`is_depiction` must be
    defined for labels as `checkbox`. Whether the object is a depiction (such as a drawing)
    rather than a real object. <br>`is_inside` must be defined
    for labels as `checkbox`. Whether the object is seen from the inside.
  - Masks:
    <br>`box_id` must be defined for labels as `text`. An identifier for
    the bounding box associated with the mask.
    <br>`predicted_iou` must be defined for labels as `text` or `number`.
    Predicted IoU value with respect to the ground truth.
- Tracks: Not supported.

The downloaded file is a .zip archive with the following structure:

```
└─ taskname.zip/
    ├── annotations/
    │   ├── bbox_labels_600_hierarchy.json
    │   ├── class-descriptions.csv
    |   ├── images.meta  # additional file with information about image sizes
    │   ├── <subset_name>-image_ids_and_rotation.csv
    │   ├── <subset_name>-annotations-bbox.csv
    │   ├── <subset_name>-annotations-human-imagelabels.csv
    │   └── <subset_name>-annotations-object-segmentation.csv
    ├── images/
    │   ├── subset1/
    │   │   ├── <image_name101.jpg>
    │   │   ├── <image_name102.jpg>
    │   │   └── ...
    │   ├── subset2/
    │   │   ├── <image_name201.jpg>
    │   │   ├── <image_name202.jpg>
    │   │   └── ...
    |   ├── ...
    └── masks/
        ├── subset1/
        │   ├── <mask_name101.png>
        │   ├── <mask_name102.png>
        │   └── ...
        ├── subset2/
        │   ├── <mask_name201.png>
        │   ├── <mask_name202.png>
        │   └── ...
        ├── ...
```

## Open Images import

Uploaded file: a zip archive of the following structure:

```
└─ upload.zip/
    ├── annotations/
    │   ├── bbox_labels_600_hierarchy.json
    │   ├── class-descriptions.csv
    |   ├── images.meta  # optional, file with information about image sizes
    │   ├── <subset_name>-image_ids_and_rotation.csv
    │   ├── <subset_name>-annotations-bbox.csv
    │   ├── <subset_name>-annotations-human-imagelabels.csv
    │   └── <subset_name>-annotations-object-segmentation.csv
    └── masks/
        ├── subset1/
        │   ├── <mask_name101.png>
        │   ├── <mask_name102.png>
        │   └── ...
        ├── subset2/
        │   ├── <mask_name201.png>
        │   ├── <mask_name202.png>
        │   └── ...
        ├── ...
```

Image ids in the `<subset_name>-image_ids_and_rotation.csv` should match with
image names in the task.
