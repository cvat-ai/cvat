### Fixed

- Fixed unexpected deletion of log files of other processes that led to OSError:
  \[Errno 116\] Stale file handle error on NFS volumes
  (<https://github.com/cvat-ai/cvat/pull/8121>)

### Changed

- Log files for individual backend processes are now stored in ephemeral
  storage of each backend container rather than in the `cvat_logs` volume
  (<https://github.com/cvat-ai/cvat/pull/8121>)
