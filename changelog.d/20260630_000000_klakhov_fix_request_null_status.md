### Fixed

- Requests API no longer returns a `null` status when a job's status cannot be
  read from Redis (e.g. the job expired) (<https://github.com/cvat-ai/cvat/pull/10849>)
