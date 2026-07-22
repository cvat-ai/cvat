### Fixed

- Reduced misleading event log entries for webhook delivery failures by recording
  an exception only after all retries are exhausted, and shortened the connection
  timeout for unreachable webhook consumers
  (<https://github.com/cvat-ai/cvat/pull/10921>)
