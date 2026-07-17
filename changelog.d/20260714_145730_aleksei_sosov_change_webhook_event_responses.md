### Added

- \[Server API\] Added request-completion webhooks with requests API payloads
  (<https://github.com/cvat-ai/cvat/pull/10897>)

- \[Server API\] Added a `changes` field to update webhook payloads
  (<https://github.com/cvat-ai/cvat/pull/10897>)

### Changed

- \[Server API\] `GET /api/webhooks/events` now returns event metadata objects
  (<https://github.com/cvat-ai/cvat/pull/10897>)

### Removed

- \[Server API\] Removed the unusable `delete:organization` webhook event
  (<https://github.com/cvat-ai/cvat/pull/10897>)

- \[Server API\] Removed the legacy `create:export` and `create:backup` events
  (<https://github.com/cvat-ai/cvat/pull/10897>)
