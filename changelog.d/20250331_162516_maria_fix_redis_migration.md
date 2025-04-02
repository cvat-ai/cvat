### Fixed

- Redis migration `002_update_meta_in_export_related_jobs` could fail
  due to stale RQ job keys in the deferred job registry
  (<https://github.com/cvat-ai/cvat/pull/9278>)
