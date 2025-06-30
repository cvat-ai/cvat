### Changed

- The `PATCH` and `PUT` methods on the `/api/(tasks|jobs)/<id>/annotations`
  paths now verify that annotation IDs are present/absent, depending on the
  action
  (<https://github.com/cvat-ai/cvat/pull/9583>)
