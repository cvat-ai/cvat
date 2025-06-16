### Changed

- Kvrocks: configured auto compaction at scheduled time.
  (<https://github.com/cvat-ai/cvat/pull/9524>)

### Added

- `CVAT_CACHE_ITEM_MAX_SIZE` option that limits size of data chunk at CVAT level.
  Generating data that exceeds the size will result in an exception.
  (<https://github.com/cvat-ai/cvat/pull/9524>)
