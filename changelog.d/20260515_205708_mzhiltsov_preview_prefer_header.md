### Added

- \[Server API\] The project/task/job `preview` endpoints accept
  `Prefer: handling=empty` (RFC 7240). When set, entities without a
  media-derived preview (e.g. point cloud tasks) return `204 No Content`
  instead of the default placeholder PNG, and the response carries
  `Preference-Applied: handling=empty` and `Vary: Prefer`
  (<https://github.com/cvat-ai/cvat/pull/10611>)
