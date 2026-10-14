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
- \[Server API\] Any annotation job in the annotation stage of a 2D task can be
  merged (`POST /api/consensus/merges`), whether it has none, one or several
  replica jobs
  (<https://github.com/cvat-ai/cvat/pull/11305>)
- \[Server API\] The number of replica jobs per annotation job is no longer
  limited at task creation, and 1 is accepted. Instead, merging rejects an
  annotation job with more started replica jobs than the
  `CVAT_MAX_CONSENSUS_REPLICAS` server setting allows (11 by default)
  (<https://github.com/cvat-ai/cvat/pull/11305>)
- The "Consensus management" and "Merge consensus jobs" actions are available
  for every task, the "Merge consensus job" action is available for every
  annotation job that has replica jobs
  (<https://github.com/cvat-ai/cvat/pull/11305>)

### Removed

- \[Server API\] The `consensus_enabled` field of tasks and the deprecated
  `consensus_replicas` field of jobs are removed from the REST API responses
  (<https://github.com/cvat-ai/cvat/pull/11305>)
- \[Server API\] The `consensus_replicas` parameter of the task creation request
  (`POST /api/tasks`) is removed, use `replicas_per_job` in the task data request instead
  (<https://github.com/cvat-ai/cvat/pull/11305>)
