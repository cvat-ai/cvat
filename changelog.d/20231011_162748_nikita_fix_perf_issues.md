### Removed

- /api/projects, /api/tasks, /api/jobs don't return information about the count
  of labels anymore. The information significantly complicates SQL queries and
  it is hard to optimize them. Use /api/labels?task_id=tid or
  /api/labels?project_id=pid instead.
  (<https://github.com/opencv/cvat/pull/6918>)

