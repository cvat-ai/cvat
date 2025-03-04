### Deprecated

- Utilizing `GET /api/projects/id/dataset?action=import_status` API endpoint
  to check the status of the import process (<https://github.com/cvat-ai/cvat/pull/9075>)

### Changed

- `GET /api/projects/id/dataset` API endpoint no longer handles dataset export process
  (<https://github.com/cvat-ai/cvat/pull/9075>)
- `GET /api/projects/id/annotations` API endpoint no longer handles annotations export process
  (<https://github.com/cvat-ai/cvat/pull/9075>)
- `GET /api/projects/id/backup` API endpoint no longer handles project export process
  (<https://github.com/cvat-ai/cvat/pull/9075>)
- `GET /api/tasks/id/dataset` API endpoint no longer handles dataset export process
  (<https://github.com/cvat-ai/cvat/pull/9075>)
- `GET /api/tasks/id/annotations?format=` API endpoint no longer handles annotations export process
  (<https://github.com/cvat-ai/cvat/pull/9075>)
- `GET /api/tasks/id/backup` API endpoint no longer handles task export process
  (<https://github.com/cvat-ai/cvat/pull/9075>)
- `GET /api/jobs/id/dataset` API endpoint no longer handles dataset export process
  (<https://github.com/cvat-ai/cvat/pull/9075>)
- `GET /api/jobs/id/annotations?format=` API endpoint no longer handles annotations export process
  (<https://github.com/cvat-ai/cvat/pull/9075>)

### Added

- New API endpoints for downloading files prepared by an export process:
  `GET /api/projects|tasks|jobs/dataset|backup/download?rq_id=rq_id`
  (<https://github.com/cvat-ai/cvat/pull/9075>)
