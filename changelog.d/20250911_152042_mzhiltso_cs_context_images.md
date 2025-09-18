### Added

- Support for related images in 2d and 3d tasks bound to cloud storages
  (<https://github.com/cvat-ai/cvat/pull/9757>)
- Support for 3d tasks with non-archived files bound to cloud storages
  (<https://github.com/cvat-ai/cvat/pull/9757>)
- \[Dataset manifest tool\] now can handle 3d datasets in all 4 supported file layouts
  (<https://github.com/cvat-ai/cvat/pull/9757>)

### Changed

- Enabled validation of the frame `width` and `height` fields in manifests
  (now required both for 2d and 3d dataset manifests)
  (<https://github.com/cvat-ai/cvat/pull/9757>)
- Dataset manifests now can include the `original_name` meta field with the server file name
  (<https://github.com/cvat-ai/cvat/pull/9757>)

### Deprecated

- Excessive filtering for media files containing "related_images" in the path during task creation.
  Only the actual related images wrt. the input media layout will be filtered out in the future.
  (<https://github.com/cvat-ai/cvat/pull/9757>)

### Fixed

- Related image detection for 2d and 3d media in all 5 supported layouts
  (<https://github.com/cvat-ai/cvat/pull/9757>)
- Improved documentation about supported task file layouts with related images
  (<https://github.com/cvat-ai/cvat/pull/9757>)
- Improved error messages for invalid media in task creation
  (<https://github.com/cvat-ai/cvat/pull/9757>)
