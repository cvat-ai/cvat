### Fixed

- Logging out of one session will no longer log the user out of all their
  other sessions
  (<https://github.com/cvat-ai/cvat/pull/8289>)

### Changed

- User sessions now expire after two weeks of inactivity
  (<https://github.com/cvat-ai/cvat/pull/8289>)

- A user changing their password will now invalidate all of their sessions
  except for the current one
  (<https://github.com/cvat-ai/cvat/pull/8289>)

