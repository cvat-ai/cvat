### Added

- Added `cvat_rqworker_pool` management command that runs an RQ worker pool with a
  pinned multiprocessing start method (`CVAT_RQ_POOL_MULTIPROCESSING_START_METHOD`),
  enabling explicit fork-based scaling of webhook delivery workers
  (<https://github.com/cvat-ai/cvat/pull/10693>)
- Added `attempt` and `request_duration` fields to webhook deliveries
  (<https://github.com/cvat-ai/cvat/pull/10693>)
