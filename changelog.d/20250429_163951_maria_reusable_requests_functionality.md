### Removed

- The `POST /api/consensus/merges?rq_id=rq_id` endpoint no longer supports
  process status checking
  (<https://github.com/cvat-ai/cvat/pull/9230>)
- The `GET /api/projects/id/dataset?action=import_status` endpoint no longer
  supports process status checking
  (<https://github.com/cvat-ai/cvat/pull/9230>)
- The `POST /api/projects/backup?rq_id=rq_id` endpoint no longer supports
  process status checking
  (<https://github.com/cvat-ai/cvat/pull/9230>)
- The `POST /api/tasks/backup?rq_id=rq_id` endpoint no longer supports
  process status checking
  (<https://github.com/cvat-ai/cvat/pull/9230>)
- The `PUT /api/tasks/id/annotations?rq_id=rq_id&format=format` endpoint
  no longer supports process status checking
  (<https://github.com/cvat-ai/cvat/pull/9230>)
- The `PUT /api/jobs/id/annotations?rq_id=rq_id&format=format` endpoint
  no longer supports process status checking
  (<https://github.com/cvat-ai/cvat/pull/9230>)
- \[SDK\] `DatasetWriteRequest`, `BackupWriteRequest`, `TaskAnnotationsWriteRequest`,
  `JobAnnotationsUpdateRequest`, `TaskAnnotationsUpdateRequest` classes were removed
  (<https://github.com/cvat-ai/cvat/pull/9230>)

### Deprecated

- The `GET /api/events` endpoint is deprecated in favor of the `POST /api/events/export`,
  `GET /api/requests/rq_id`, and `GET result_url`, where `result_url` is obtained from
  background request details
  (<https://github.com/cvat-ai/cvat/pull/9230>)
- The `POST /api/quality/reports/rq_id=rq_id` is deprecated in favor of
  `GET /api/requests/rq_id`
  (<https://github.com/cvat-ai/cvat/pull/9230>)

### Changed
- Cache files with exported events now are stored in `/data/cache/export/` instead of
  `/data/tmp/`. These files are periodically deleted by the
  `cleanup_export_cache_directory` cron job
  (<https://github.com/cvat-ai/cvat/pull/9230>)
