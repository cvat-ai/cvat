### Added

- Added `attempt`, `outcome` and `request_duration` fields to webhook deliveries
  (<https://github.com/cvat-ai/cvat/pull/10693>)

### Changed

- \[Helm\] Backend workers are now configured via per-worker
  `cvat.backend.worker.<name>.numProcs` (number of supervisord-managed
  processes in a pod) and `cvat.backend.worker.<name>.args` values (`type`,
  `queues`, `withScheduler`, plus `numWorkers` — required for
  `type: worker-pool` — RQ workers forked by each pool process). The
  `NUMPROCS` environment variable on worker pods is set from `numProcs` by
  the chart and overrides any `NUMPROCS` entry in `additionalEnv`; the
  liveness probe expects `numProcs * args.numWorkers` live workers for
  `worker-pool` and `numProcs` for `worker`
  (<https://github.com/cvat-ai/cvat/pull/10693>)

### Removed

- \[Helm\] The `cvat.backend.worker.utils.extraArgs` value; list extra queue
  names in `cvat.backend.worker.utils.args.queues` instead
  (<https://github.com/cvat-ai/cvat/pull/10693>)
