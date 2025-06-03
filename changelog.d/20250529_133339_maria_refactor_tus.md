### Changed

- \[TUS\] After finishing file upload using the TUS protocol, the next request that initiates
  the import process must include the TUS `file_id` instead of the original file name.
  It can be obtained from the `Upload-Filename` response header.
  (<https://github.com/cvat-ai/cvat/pull/9471>)

### Fixed

- \[TUS\] TUS metadata files store only declared fields
  (<https://github.com/cvat-ai/cvat/pull/9471>)

### Removed

- \[TUS\] `Upload-Filename` header from server responses when handling append chunk requests
  (<https://github.com/cvat-ai/cvat/pull/9471>)
