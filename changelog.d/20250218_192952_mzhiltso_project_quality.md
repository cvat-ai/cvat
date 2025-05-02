### Added

- Annotation quality checks for projects
  (<https://github.com/opencv/cvat/pull/9116>)

### Deprecated

- \[Server API\] `GET api/quality/reports` and `GET api/quality/reports/{id}/` responses:
  - `frame_count` - deprecated in favor of the new `validation_frames` field,
  - `frame_share` - deprecated in favor of the new `validation_frame_share` field
  (<https://github.com/opencv/cvat/pull/9116>)

### Fixed

- Optimized `GET api/quality/reports/`, `GET api/quality/conflicts/` requests,
  permission checks in `api/quality/*` endpoints
  (<https://github.com/opencv/cvat/pull/9116>)