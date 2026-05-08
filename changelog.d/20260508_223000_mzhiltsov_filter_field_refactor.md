### Added

- \[Server API\] New filter parameters: `read_only` on `/api/access_tokens`; `user_id` and `accepted` on `/api/invitations`; `org_id` on `/api/requests`. The `accepted` field is now also returned by `/api/invitations`, and `operation.org_id` by `/api/requests`
  (<https://github.com/cvat-ai/cvat/pull/10569>)

### Changed

- \[Server API\] Enum-like fields (e.g. `status`, `state`, `role`, `type`, `provider_type`) are no longer matched by the `?search=` parameter on list endpoints; use the corresponding exact-match filter instead
  (<https://github.com/cvat-ai/cvat/pull/10569>)
