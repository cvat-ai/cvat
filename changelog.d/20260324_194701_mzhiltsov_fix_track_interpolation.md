### Changed

- The last visible interval in imported tracks will now include
  2 keyframes - the last visible shape and the outside shape,
  when importing from a dataset with track annotations. If the annotations were created in CVAT,
  track keyframes after the import can be slightly different from the original annotations,
  if the dataset format does not have native track support.
  (<https://github.com/cvat-ai/cvat/pull/10409>)

### Fixed

- Exported interpolated shapes in 3d cuboid tracks could have invalid rotation
  (<https://github.com/cvat-ai/cvat/pull/10409>)
- The last visible interval in imported tracks could be interpolated incorrectly
  (<https://github.com/cvat-ai/cvat/pull/10409>)
