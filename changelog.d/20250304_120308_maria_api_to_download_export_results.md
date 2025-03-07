### Deprecated

- Utilizing `GET /api/projects/id/dataset?action=import_status` API endpoint
  to check the status of the import process. Instead, the `GET /api/requests/rq_id`
  requests API should be used (<https://github.com/cvat-ai/cvat/pull/9075>)

### Removed

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
