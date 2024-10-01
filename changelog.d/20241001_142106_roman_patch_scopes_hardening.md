### Changed

- Made the `PATCH` endpoints for projects, tasks, jobs and memberships check
  the input more strictly
  (<https://github.com/cvat-ai/cvat/pull/8493>):

  - unknown fields are rejected;
  - updating a field now requires the same level of permissions regardless of
    whether the new value is the same as the old value.
