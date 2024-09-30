### Added

- \[Server API\] An option to change real frames for honeypot frames in tasks with honeypots
  (<https://github.com/cvat-ai/cvat/pull/8471>)
- \[Server API\] New endpoints for validation configuration management in tasks and jobs
  `/api/tasks/{id}/validation_layout`, `/api/jobs/{id}/validation_layout`
  (<https://github.com/cvat-ai/cvat/pull/8471>)

### Changed
- \[Server API\] Now chunks in tasks can be changed.
  There are new API elements to check chunk relevancy, if they are cached:
  `/api/tasks/{id}/data/meta` got a new field `chunks_updated_date`,
  `/api/tasks/{id}/data/?type=chunk` got 2 new headers: `X-Updated-Date`, `X-Checksum`
  (<https://github.com/cvat-ai/cvat/pull/8471>)