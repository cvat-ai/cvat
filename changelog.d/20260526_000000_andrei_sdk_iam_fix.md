### Fixed

- \[SDK\] Fixed `Project.get_tasks()`, `Project.get_labels()`, `Task.get_jobs()`,
  `Task.get_labels()`, `Job.get_issues()`, `Job.get_labels()`, and `Issue.get_comments()`
  methods returning an empty list when called on organization resources without
  an explicit organization context set on the client
  (<https://github.com/cvat-ai/cvat/pull/10665>)

- \[SDK\] Fixed the generated API client in
  `cvat-sdk/gen/templates/openapi-generator/api_client.mustache` so per-request
  header arguments override default headers, and header arguments with `None`
  values are omitted instead of being serialized. This allows organization-aware
  SDK helpers to suppress the default `X-Organization` header while sending
  requests with `org_id`
  (<https://github.com/cvat-ai/cvat/pull/10665>)
