### Changed

- \[Server API\] Renamed the dataset export and backup export webhook events
  from `create:export` and `create:backup` to `create:dataset_export` and
  `create:backup_export`
  (<https://github.com/cvat-ai/cvat/pull/10815>)
- \[Server API\] Added the `subresource` field to export webhook payloads
  to distinguish dataset, annotation, and backup requests
  (<https://github.com/cvat-ai/cvat/pull/10815>)
