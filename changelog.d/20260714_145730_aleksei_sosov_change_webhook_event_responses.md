### Added

- Added webhooks for async requests
  (<https://github.com/cvat-ai/cvat/pull/10897>)

- \[Server API\] Added a `changes` field to update webhook payloads
  (<https://github.com/cvat-ai/cvat/pull/10897>)

- \[Server API\] `GET /api/webhooks/events` now returns objects with `key` and
  `group.display_name` instead of plain event key strings
  (<https://github.com/cvat-ai/cvat/pull/10897>)

### Removed

- \[Server API\] Removed the unusable `delete:organization` webhook event
  (<https://github.com/cvat-ai/cvat/pull/10897>)

- \[Server API\] The `create:export` and `create:backup` webhook events
  were renamed to `completed:request[export:{dataset,annotations,backup}]`.
  The existing clients must be updated for compatibility.
  (<https://github.com/cvat-ai/cvat/pull/10897>)
