### Added

- The `movetasktobackingcs` and `movetasktobackingcs` commands can now load
  a list of tasks to migrate from a file
  (<https://github.com/cvat-ai/cvat/pull/10504>)

- The `movetasktobackingcs` and `movetasktobackingcs` commands now print
  statistics about the transfer
  (<https://github.com/cvat-ai/cvat/pull/10504>)

### Changed

- The `movetasktobackingcs` and `movetasktobackingcs` no longer exit with a
  failure status when the given task already has the expected backing CS
  (<https://github.com/cvat-ai/cvat/pull/10504>)

### Fixed

- Tasks without manifests can now use backing cloud storage
  (<https://github.com/cvat-ai/cvat/pull/10504>)
