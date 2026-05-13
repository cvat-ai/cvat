### Changed

- \[Server API\] Tasks without data will not report their chunk types or chunk size
  (<https://github.com/cvat-ai/cvat/pull/10551>)

- \[Server API\] The minimum accepted value of `image_quality` in
  `/api/tasks/<id>/data` is now 1 (was 0); `0` was never a usable JPEG quality
  (<https://github.com/cvat-ai/cvat/pull/10551>)

### Deprecated

- \[Server API\] `image_quality` in `/api/tasks[/<id>]` and `/api/{tasks,jobs}/<id>/data/meta`
  endpoints for 3D tasks
  (<https://github.com/cvat-ai/cvat/pull/10551>)
