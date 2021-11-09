---
linkTitle: 'Open Images V6'
weight: 15
---

# [Open Images](https://storage.googleapis.com/openimages/web/index.html)

- [Format specification](https://storage.googleapis.com/openimages/web/download.html)

- Supported annotations:

  - Rectangles (detection task)
  - Tags (classification task)
  - Polygons (segmentation task)

- Supported attributes:

  - Labels

    - `score` (should be defined for labels as `text` or `number`).
      The confidence level from 0 to 1.

  - Bounding boxes

    - `score` (should be defined for labels as `text` or `number`).
      The confidence level from 0 to 1.
    - `occluded` (both UI option and a separate attribute).
      Whether the object is occluded by another object.
    - `truncated` (should be defined for labels as `checkbox` -es).
      Whether the object extends beyond the boundary of the image.
    - `is_group_of` (should be defined for labels as `checkbox` -es).
      Whether the object represents a group of objects of the same class.
    - `is_depiction` (should be defined for labels as `checkbox` -es).
      Whether the object is a depiction (such as a drawing)
      rather than a real object.
    - `is_inside` (should be defined for labels as `checkbox` -es).
      Whether the object is seen from the inside.

  - Masks
    - `box_id` (should be defined for labels as `text`).
      An identifier for the bounding box associated with the mask.
    - `predicted_iou` (should be defined for labels as `text` or `number`).
      Predicted IoU value with respect to the ground truth.

## Open Images export

Downloaded file: a zip archive of the following structure:

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
