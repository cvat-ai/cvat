### Changed

- Extend organization filtering on list endpoints: `org_id=0` explicitly requests
  results from all organizations, and resource filters (`job_id`, `task_id`,
  `project_id`) automatically infer the organization in the sandbox context
  (<https://github.com/cvat-ai/cvat/issues/10776>)
