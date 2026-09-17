### Added

- Export and import background jobs (dataset, annotations, backup) are now
  retried automatically on failure; the number of retries and the delay
  between them can be configured via the `CVAT_EXPORT_JOB_RETRY_INTERVALS`
  and `CVAT_IMPORT_JOB_RETRY_INTERVALS` environment variables
  (<https://github.com/cvat-ai/cvat/pull/11154>)

### Removed

- The `CVAT_EXPORT_LOCKED_RETRY_INTERVAL` environment variable (and its
  deprecated alias `CVAT_DATASET_EXPORT_LOCKED_RETRY_INTERVAL`) no longer
  have any effect
  (<https://github.com/cvat-ai/cvat/pull/11154>)
