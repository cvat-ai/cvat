### Fixed

- Prevent duplicate shapes when annotation save fails after the server persists
  changes by improving proxy-timeout reconciliation in the core saver and
  reloading annotations from the server on failed saves in the UI
  (<https://github.com/cvat-ai/cvat/issues/10503>)
