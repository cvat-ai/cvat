### Added

- Uvicorn process as an upstream backup. This should help if the main process
  is not available during restart (mostly after killing due OOM).
  (<https://github.com/cvat-ai/cvat/pull/9590>)
