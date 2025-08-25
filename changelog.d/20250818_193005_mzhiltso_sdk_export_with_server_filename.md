### Added

- \[SDK, CLI\] Support for exporting with server-generated filename
  (<https://github.com/cvat-ai/cvat/pull/9732>)

### Changed

- \[CLI\] `task backup` and `task export-dataset` now download files with the server-generated
  filenames by default
  (<https://github.com/cvat-ai/cvat/pull/9732>)
- \[CLI\] `task backup` and `task export-dataset` now always export files locally,
  regardless of the default export location on the server
  (<https://github.com/cvat-ai/cvat/pull/9732>)
