### Fixed

- Serializing a project no longer loads every task of the project from the
  database (twice) to compute the `task_subsets` and `dimension` summary
  fields; aggregate queries are used instead. Previously, each serialized
  project (e.g. in every project list response and in every project event)
  cost two full scans of its task set, which made project-related responses
  degrade linearly with project size
  (<https://github.com/cvat-ai/cvat/pull/10772>)

- Deleted objects are no longer serialized for webhook payloads when no
  webhook subscribes to the corresponding `delete` event. Previously every
  deleted task, job, issue and comment — including each object cascade-deleted
  together with its parent project or task — was deep-copied and fully
  serialized with several extra DB queries per object, even on instances with
  no webhooks configured, making bulk deletions significantly slower
  (<https://github.com/cvat-ai/cvat/pull/10772>)
