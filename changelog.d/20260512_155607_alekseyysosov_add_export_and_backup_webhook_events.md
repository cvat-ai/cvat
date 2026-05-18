### Added

- \[Server API\] Webhook events `create:export` and `create:backup` that
  fire when a dataset export or a project/task backup finishes (success
  or failure), so subscribers no longer need to poll `/api/requests` for
  the outcome
  (<https://github.com/cvat-ai/cvat/pull/10585>)
