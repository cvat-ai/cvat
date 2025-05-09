### Fixed

- `redis.exceptions.ResponseError: wrong number of arguments for 'watch' command` exception that
  could be raised inside a worker when enqueuing jobs that depend on a running job
  (<https://github.com/cvat-ai/cvat/pull/9297>)

### Changed

- Requests that initiate background processes (e.g. exporting datasets) now return a request ID
  too when a 409 status is returned
  (<https://github.com/cvat-ai/cvat/pull/9297>)

### Added

- \[SDK\] `BackgroundRequestException` which is now raised instead of `ApiException`
  when a background request (e.g., exporting a dataset or creating a task) fails
  (<https://github.com/cvat-ai/cvat/pull/9297>)
