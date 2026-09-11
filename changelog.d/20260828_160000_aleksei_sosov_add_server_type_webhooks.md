### Added

- Added server-type webhooks with `create:user`, `update:user`,
  `delete:user`, `create:organization`, and `delete:organization` events.
  (<https://github.com/cvat-ai/cvat/pull/11106>)

- \[Server API\] Added an `email_verified` field to `GET /api/users`
  response
  (<https://github.com/cvat-ai/cvat/pull/11106>)

- Added a Django admin panel for managing webhooks
  (<https://github.com/cvat-ai/cvat/pull/11106>)

### Changed

- \[Server API\] Webhook payloads for `completed:request[...]` events now
  include a `sender` field.
  (<https://github.com/cvat-ai/cvat/pull/11106>)
