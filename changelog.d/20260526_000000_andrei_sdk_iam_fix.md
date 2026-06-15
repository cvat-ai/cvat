### Fixed

- \[SDK\] Fixed `Project.get_tasks()`, `Project.get_labels()`, `Task.get_jobs()`,
  `Task.get_labels()`, `Job.get_issues()`, `Job.get_labels()`, and `Issue.get_comments()`
  methods returning an empty list when called on organization resources without
  an explicit organization context set on the client, or with a different
  organization context set
  (<https://github.com/cvat-ai/cvat/pull/10665>)

### Changed

- \[SDK\] The `x_organization` parameter passed to individual API calls
  now takes precedence over the client-level `organization_slug`. Previously,
  `organization_slug` would silently override it, causing those calls to
  operate in the wrong organization context
  (<https://github.com/cvat-ai/cvat/pull/10665>)
