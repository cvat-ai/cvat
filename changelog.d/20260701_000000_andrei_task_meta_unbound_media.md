### Fixed

- Requesting task metadata (`GET /api/tasks/<id>/data/meta`) before any
  data was uploaded to the task now returns 400 with a clear message.
  (<https://github.com/cvat-ai/cvat/pull/10855>)
