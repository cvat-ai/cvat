### Fixed

- Heavyweight backups created from tasks using cloud storage that have
  images as frames and non-default start frame, stop frame or frame step
  settings no longer fail to import. Note that the fix is for backup
  creation; as such, CVAT will still not be able to import backups of
  such tasks created by previous versions
  (<https://github.com/cvat-ai/cvat/pull/10004>)
