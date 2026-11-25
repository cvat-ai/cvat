### Added

- Organization owners and admins can transfer ownership to an active maintainer
  of the organization with `PATCH /api/organizations/{id}` and `owner_id`.
  The previous owner becomes a maintainer
  (<https://github.com/cvat-ai/cvat/pull/11529>)

### Changed

- `PATCH /api/organizations/{id}` rejects unknown fields with 403
  instead of ignoring them
  (<https://github.com/cvat-ai/cvat/pull/11529>)
