### Fixed

- Prevent possible cyclic dependencies when enqueuing a rq job when ONE_RUNNING_JOB_IN_QUEUE_PER_USER is used
  (<https://github.com/opencv/cvat/pull/7139>)
- Enqueue deferred jobs when their dependencies are moved to the failed job registry due to AbandonedJobError
  (<https://github.com/opencv/cvat/pull/7139>)
