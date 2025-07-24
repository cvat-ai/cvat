### Added

- \[SDK, CLI\] Added an auto-annotation function interface for tracker
  functions, and agent support for it
  (<https://github.com/cvat-ai/cvat/pull/9579>)

- \[SDK\] `TaskDataset` now supports tasks with video chunks when created
  with `MediaDownloadPolicy.PRELOAD_ALL`; this also means that agents can
  process interactive detection requests on such tasks
  (<https://github.com/cvat-ai/cvat/pull/9579>)
