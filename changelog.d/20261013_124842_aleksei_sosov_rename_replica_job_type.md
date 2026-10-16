### Added

- \[Server API\] The `initial_replicas` parameter of the task creation request
  (`POST /api/tasks`) sets the number of replica jobs created for each
  annotation job. The value is returned in the task responses (`GET /api/tasks`)
  (<https://github.com/cvat-ai/cvat/pull/11305>)

### Changed

- \[Server API\] The `consensus_replica` job type is renamed to `replica`
  (<https://github.com/cvat-ai/cvat/pull/11305>)
- The "Consensus Replicas" field of the task creation form is renamed to
  "Initial replicas"
  (<https://github.com/cvat-ai/cvat/pull/11305>)
- \[Server API\] An annotation job in the annotation stage of a 2D task can be
  merged (`POST /api/consensus/merges`) when it has one or several started
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

### Deprecated

- \[Server API\] The `consensus_replicas` parameter of the task creation request
  (`POST /api/tasks`) is deprecated, use `initial_replicas` instead
  (<https://github.com/cvat-ai/cvat/pull/11305>)
- \[Server API\] The `consensus_replica` job type is still accepted as an alias of
  `replica` in the `type` and `filter` parameters of `GET /api/jobs`
  (<https://github.com/cvat-ai/cvat/pull/11305>)

### Removed

- \[Server API\] The `consensus_enabled` field of tasks and the deprecated
  `consensus_replicas` field of jobs are removed from the REST API responses
  (<https://github.com/cvat-ai/cvat/pull/11305>)
