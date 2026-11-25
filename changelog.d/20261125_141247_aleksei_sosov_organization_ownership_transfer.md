### Added

- Organization owners can transfer ownership to an active maintainer with
  the new **Transfer ownership** action on the organization page
  (<https://github.com/cvat-ai/cvat/pull/11529>)
- \[Server API\] Organization owners and admins can transfer ownership
  with `PATCH /api/organizations/{id}` and `owner_id`
  (<https://github.com/cvat-ai/cvat/pull/11529>)

### Changed

- `PATCH /api/organizations/{id}` rejects unknown fields with 403
  instead of ignoring them
  (<https://github.com/cvat-ai/cvat/pull/11529>)
