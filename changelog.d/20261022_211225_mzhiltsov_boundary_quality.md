### Added

- Added an option to check object boundaries using the Boundary F1 metric in quality checks.
  Available for bounding boxes, ellipses, polygons, masks, and polylines.
  (<https://github.com/cvat-ai/cvat/pull/11366>)

### Changed

- \[Server API\] Quality requirements now allow to select the object similarity metric used.
  OKS and IoU use different configuration options for the similarity metric threshold:
  IoU - `iou_threshold`; OKS - `oks_threshold`. The existing IoU thresholds for points are moved.
  (<https://github.com/cvat-ai/cvat/pull/11366>)
