### Fixed

- \[SDK\] Fixed a crash in `TasksRepo.create_from_backup`,
  `ProjectsRepo.create_from_backup`, `Task.upload_data` that could occur
  if a recoverable error occurred during chunk uploading
  (<https://github.com/cvat-ai/cvat/pull/10375>)
