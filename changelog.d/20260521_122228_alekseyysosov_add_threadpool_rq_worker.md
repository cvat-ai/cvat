### Added

- A new thread-pool background worker that lets a single worker process handle
  many jobs at once. For queues whose jobs mostly wait on network I/O (such as
  outgoing webhooks), one such worker can now do the work that previously needed
  several separate worker processes, lowering the memory footprint of a CVAT
  deployment. It is off by default; administrators can enable it for a specific
  queue by starting that worker with `--worker-class
  cvat.apps.redis_handler.worker.ThreadPoolWorker` and setting the number
  of concurrent jobs through the `CVAT_RQ_THREAD_POOL_SIZE` environment variable
  (<https://github.com/cvat-ai/cvat/pull/10650>)
