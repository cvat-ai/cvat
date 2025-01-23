### Added

- Setting `TMP_FILE_OR_DIR_RETENTION_DAYS`, which defines maximum retention period
  of a file or dir in temporary directory
  (<https://github.com/cvat-ai/cvat/pull/8804>)
- Cron job to remove outdated files and directories from CVAT tmp directory
  (<https://github.com/cvat-ai/cvat/pull/8804>)

### Changed

- Export cache cleaning moved to a separate cron job
  (<https://github.com/cvat-ai/cvat/pull/8804>)
