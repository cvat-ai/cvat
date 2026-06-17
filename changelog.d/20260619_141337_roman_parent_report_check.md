### Fixed

- Fixed incorrect responses being returned from the `GET
  /api/quality/reports` endpoint when the `parent_id` parameter
  refers to a report inaccessible by the current user
  (<https://github.com/cvat-ai/cvat/pull/10807>)

### Security

- Fixed a bug allowing a user to determine whether an inaccessible
  quality report is located in an organization they are not a member of
  or elsewhere
  (<https://github.com/cvat-ai/cvat/pull/10807>)
