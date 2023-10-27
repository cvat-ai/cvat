### Added

- Ability to limit one user to one task at a time
  (<https://github.com/opencv/cvat/pull/6975>)

### Fixed

- Bug with viewing dependent RQ jobs for downloading resources from
cloud storage when file path contains sub-directories.
This is relevant for admins that can view detailed information about RQ queues.
  (<https://github.com/opencv/cvat/pull/6975>)

### Changed

- Migrated to rq 1.15.1
  (<https://github.com/opencv/cvat/pull/6975>)
