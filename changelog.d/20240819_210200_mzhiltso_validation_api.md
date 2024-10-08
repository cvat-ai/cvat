### Added

- New task mode: Honeypots (GT pool)
  (<https://github.com/cvat-ai/cvat/pull/8348>)
- New task creation options for quality control: Honeypots (GT pool), GT job
  (<https://github.com/cvat-ai/cvat/pull/8348>)
- New GT job frame selection method: `random_per_job`,
  which guarantees each job will have GT overlap
  (<https://github.com/cvat-ai/cvat/pull/8348>)
- \[Server API\] POST `/jobs/`: new frame selection parameters,
  which accept percentages, instead of absolute values
  (<https://github.com/cvat-ai/cvat/pull/8348>)
- \[Server API\] GET `/api/tasks/{id}/` got a new `validation_mode` field,
  reflecting the current validation configuration (immutable)
  (<https://github.com/cvat-ai/cvat/pull/8348>)
- \[Server API\] POST `/api/tasks/{id}/data` got a new `validation_params` field,
  which allows to enable `GT` and `GT_POOL` validation for a task on its creation
  (<https://github.com/cvat-ai/cvat/pull/8348>)

### Changed

- \[Server API\] POST `/jobs/` `.frames` field now expects relative frame numbers
  instead of absolute (source data) ones
  (<https://github.com/cvat-ai/cvat/pull/8348>)
