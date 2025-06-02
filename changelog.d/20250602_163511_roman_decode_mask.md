### Added

- \[SDK\] Added `decode_mask`, a utility function that creates a bitmap
  based on the `points` array in a mask shape
  (<https://github.com/cvat-ai/cvat/pull/9496>)

- \[SDK\] `encode_mask` may now be called without an explicit `bbox`,
  in which case the bounding box is determined automatically
  (<https://github.com/cvat-ai/cvat/pull/9496>)
