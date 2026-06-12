### Fixed

- \[SDK\] Fixed `Project.get_tasks()`, `Project.get_labels()`, `Task.get_jobs()`,
  `Task.get_labels()`, `Job.get_issues()`, `Job.get_labels()`, and `Issue.get_comments()`
  methods returning an empty list when called on organization resources without
  an explicit organization context set on the client, or with a different
  organization context set
  (<https://github.com/cvat-ai/cvat/pull/10665>)

### Changed

- \[SDK\] Changed requests that explicitly specify an organization by ID being
  overridden by the client-level `X-Organization` header, causing them to
  operate in the wrong organization context
  (<https://github.com/cvat-ai/cvat/pull/10665>)
