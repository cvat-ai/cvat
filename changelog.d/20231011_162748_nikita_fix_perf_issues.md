### Changed

- /api/projects, /api/tasks, /api/jobs don't return information about
  the count of labels anymore. The information is not useful and
  significantly complicates SQL queries.
  (<https://github.com/opencv/cvat/pull/6918>)

