### Added

- Added instance-level webhooks, configured via Django admin, with
  `create:user`, `update:user`, `delete:user`, `create:organization`, and
  `delete:organization` events
  (<https://github.com/cvat-ai/cvat/pull/10991>)

- \[Server API\] Added a read-only `email_verified` field to user
  responses for admins and for the requesting user
  (<https://github.com/cvat-ai/cvat/pull/10991>)

- \[Server API\] Added a read-only `created_via` field to user responses
  (<https://github.com/cvat-ai/cvat/pull/10991>)

### Changed

- \[Server API\] `GET /api/webhooks/events` now requires a `type` query
  parameter (`project` or `organization`); the previous default `all`
  catalog was removed
  (<https://github.com/cvat-ai/cvat/pull/10991>)
