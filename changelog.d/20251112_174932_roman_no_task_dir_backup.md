### Changed

- Files located in the `data/tasks/<id>` directory are no longer included
  in task backups, nor extracted from such backups when restoring. Recent
  versions of CVAT (since v2.6.2) no longer create or use such files
  (<https://github.com/cvat-ai/cvat/pull/10001>)
