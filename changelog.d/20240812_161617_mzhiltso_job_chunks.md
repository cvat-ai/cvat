### Added

- A server setting to disable media chunks on the local filesystem
  (<https://github.com/cvat-ai/cvat/pull/8272>)
- \[Server API\] `GET /api/jobs/{id}/data/?type=chunk&index=x` parameter combination.
  The new `index` parameter allows to retrieve job chunks using 0-based index in each job,
  instead of the `number` parameter, which used task chunk ids.
  (<https://github.com/cvat-ai/cvat/pull/8272>)

### Changed

- Job assignees will not receive frames from adjacent jobs in chunks
  (<https://github.com/cvat-ai/cvat/pull/8272>)

### Deprecated

- \[Server API\] `GET /api/jobs/{id}/data/?type=chunk&number=x` parameter combination
  (<https://github.com/cvat-ai/cvat/pull/8272>)


### Fixed

- Various memory leaks in video reading on the server
  (<https://github.com/cvat-ai/cvat/pull/8272>)
