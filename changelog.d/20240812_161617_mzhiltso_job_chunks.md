### Added

- A server setting to disable media chunks on the local filesystem
  (<https://github.com/cvat-ai/cvat/pull/8272>)

### Changed

- \[Server API\] Chunk ids in each job now start from 0, instead of using ones from the task
  (<https://github.com/cvat-ai/cvat/pull/8272>)

### Fixed

- Various memory leaks in video reading on the server
  (<https://github.com/cvat-ai/cvat/pull/8272>)
- Job assignees will not receive frames from adjacent jobs in the boundary chunks
  (<https://github.com/cvat-ai/cvat/pull/8272>)
