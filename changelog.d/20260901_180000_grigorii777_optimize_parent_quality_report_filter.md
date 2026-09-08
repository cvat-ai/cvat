### Fixed

- \[Server API\] Improved performance when filtering nested quality reports by
  parent and report target. The `target` parameter is now required with `parent_id`,
  and incompatible parent and requested report targets are rejected.
