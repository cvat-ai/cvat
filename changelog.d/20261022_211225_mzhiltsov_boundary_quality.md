### Added

- Added an option to match object boundaries using the Boundary F1 metric in quality checks.
  Available for bounding boxes, ellipses, polygons, masks, and polylines.
  (<https://github.com/cvat-ai/cvat/pull/XXXX>)

### Changed

- \[Server API\] Quality requirements allow to select the object similarity metric used now.
  OKS and IoU now use different configuration options for the similarity metric threshold:
  IoU - `iou_threshold`; OKS - `oks_threshold`.
  (<https://github.com/cvat-ai/cvat/pull/XXXX>)
