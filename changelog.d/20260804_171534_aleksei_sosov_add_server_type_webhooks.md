### Added

- Added server-level webhooks with `create:user`, `update:user`,
  `delete:user`, `create:organization`, and `delete:organization` events.
  They are managed by admins through the REST API or the Django admin site
  (<https://github.com/cvat-ai/cvat/pull/10991>)

- \[Server API\] Added a read-only `email_verified` field to user
  responses for admins and for the requesting user
  (<https://github.com/cvat-ai/cvat/pull/10991>)

- \[Server API\] Added a read-only `created_via` field to user responses
  (<https://github.com/cvat-ai/cvat/pull/10991>)

### Changed

- \[Server API\] `GET /api/webhooks/events` now accepts `server` as a `type`
  query parameter value
  (<https://github.com/cvat-ai/cvat/pull/10991>)

### Removed

- \[Server API\] Webhook payloads for `update:<resource>` events no longer
  contain the `before_update` and `changes` keys.
  (<https://github.com/cvat-ai/cvat/pull/10991>)

- \[Server API\] Removed the `changed_fields` field from webhook delivery
  responses
  (<https://github.com/cvat-ai/cvat/pull/10991>)
