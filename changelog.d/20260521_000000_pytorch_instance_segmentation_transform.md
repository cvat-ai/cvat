### Added

- \[SDK\] Added an `ExtractInstanceMasks` PyTorch target transform for torchvision
  instance segmentation models.
  (<https://github.com/cvat-ai/cvat/pull/10654>)

### Changed

- \[SDK\] `ExtractBoundingBoxes` now returns an empty `boxes` tensor with shape
  `[0, 4]` instead of `[0]`.
  (<https://github.com/cvat-ai/cvat/pull/10654>)
