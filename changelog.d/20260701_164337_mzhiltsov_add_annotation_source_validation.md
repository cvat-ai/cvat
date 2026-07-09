### Fixed

- \[Server API\] Added missing input validation for the `source` field of annotations
  in the `/api/tasks/<id>/annotations` and `/api/jobs/<id>/annotations` endpoints.
  The existing invalid values are returned unmodified in the server responses.
  (<https://github.com/cvat-ai/cvat/pull/10521>)
