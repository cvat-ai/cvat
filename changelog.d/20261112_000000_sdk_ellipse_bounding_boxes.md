### Fixed

- \[SDK\] PyTorch `ExtractBoundingBoxes` now includes the full extent of ellipse
  annotations instead of treating their center and radius endpoints as box corners.
  (<https://github.com/cvat-ai/cvat/issues/11469>)
