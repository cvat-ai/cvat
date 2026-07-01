### Added

- \[Server API\] Added the `create:dataset_import`, `create:backup_import`,
  `create:task_initialization`, `create:quality_report`, and
  `create:consensus_merge` webhook events for request completion notifications
  (<https://github.com/cvat-ai/cvat/pull/10842>)

### Changed

- \[Server API\] Renamed the dataset export and backup export webhook events
  from `create:export` and `create:backup` to `create:dataset_export` and
  `create:backup_export`
  (<https://github.com/cvat-ai/cvat/pull/10842>)
- \[Server API\] Added the `subresource` field to export webhook payloads
  to distinguish dataset, annotation, and backup requests
  (<https://github.com/cvat-ai/cvat/pull/10842>)
