### Added

- Constant or linearly interpolated IoU thresholds by ground truth shape area for rectangle,
  polygon, mask, and ellipse quality requirements. The editor supports adding, dragging, and deleting
  graph points, numerical editing in a vertical list, and whole-policy inheritance.
  The `iou_threshold` field accepts a number or a policy with an explicit IoU type;
  zero-area GT shapes use the first curve endpoint and remain unmatched by IoU
  (<https://github.com/cvat-ai/cvat/pull/11308>)
