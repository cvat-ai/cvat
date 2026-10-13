### Added

- \[Server API\] The `replicas_per_job` parameter of the task data request
  (`POST /api/tasks/{id}/data`) sets the number of replica jobs created for each
  annotation job
  (<https://github.com/cvat-ai/cvat/pull/11305>)

### Changed

- \[Server API\] The `consensus_replica` job type is renamed to `replica`
  (<https://github.com/cvat-ai/cvat/pull/11305>)
- The "Consensus Replicas" field of the task creation form is renamed to
  "Replicas per job"
  (<https://github.com/cvat-ai/cvat/pull/11305>)

### Removed

- \[Server API\] The `consensus_enabled` field of tasks and the deprecated
  `consensus_replicas` field of jobs are removed from the REST API responses
  (<https://github.com/cvat-ai/cvat/pull/11305>)
- \[Server API\] The `consensus_replicas` parameter of the task creation request
  (`POST /api/tasks`) is removed, use `replicas_per_job` in the task data request instead
  (<https://github.com/cvat-ai/cvat/pull/11305>)
