### Added

- Thread-pool variant of the RQ worker that runs multiple I/O-bound jobs
  concurrently within one process. Operators opt in by passing
  `--worker-class cvat_libs.rq_ext.worker.ThreadPoolWorker`
  and `--jobs-pool-size N` to `manage.py rqworker`. Intended for queues whose
  jobs spend most of their time blocked on remote I/O, where adding
  worker processes per pod is wasteful
  (<https://github.com/cvat-ai/cvat/pull/10650>)
