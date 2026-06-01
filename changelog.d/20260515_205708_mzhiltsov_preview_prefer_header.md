### Added

- \[Server API\] The project/task/job `preview` endpoints accept
  the `Prefer: handling=empty` header (RFC 7240). When set, entities without a
  media-derived preview (e.g. point cloud tasks) return `204 No Content`
  instead of the default placeholder.
  (<https://github.com/cvat-ai/cvat/pull/10611>)
