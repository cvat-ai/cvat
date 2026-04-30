### Changed

- \[Server API\] Tasks without data will not report their chunk types or chunk size
  (<https://github.com/cvat-ai/cvat/pull/10551>)

### Deprecated

- \[Server API\] `image_quality` in `/api/tasks[/<id>]` and `/api/{tasks,jobs}/<id>/data/meta`
  endpoints for 3D tasks
  (<https://github.com/cvat-ai/cvat/pull/10551>)
