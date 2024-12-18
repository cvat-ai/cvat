### Fixed

- Acquiring a long lock with a worker TTL could result in the lock not being released,
  blocking further exports with the same parameters (<https://github.com/cvat-ai/cvat/pull/8721>)
- Scheduled RQ jobs could not be restarted due to incorrect RQ job status
  updating and handling (<https://github.com/cvat-ai/cvat/pull/8721>)
- Parallel exports with the same parameters by different users caused
  a LockNotAvailableError to be raised for all users except the one
  who initiated the export first (<https://github.com/cvat-ai/cvat/pull/8721>)
