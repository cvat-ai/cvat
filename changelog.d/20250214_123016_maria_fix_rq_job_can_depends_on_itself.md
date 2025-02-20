### Fixed

- Possible race condition that could occur when importing annotations
  (<https://github.com/cvat-ai/cvat/pull/9102>)

### Deprecated

- Utilizing `PUT /api/tasks|jobs/id/annotations?rq_id=rq_id` API endpoint
  to check the status of the import process
  (<https://github.com/cvat-ai/cvat/pull/9102>)
