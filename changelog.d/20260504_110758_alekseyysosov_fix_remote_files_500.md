### Fixed

- Task creation with `remote_files` now returns a readable validation error
  when a URL is unreachable or uses an unsupported scheme, instead of a 500
  with a raw traceback
  (<https://github.com/cvat-ai/cvat/pull/10554>)
