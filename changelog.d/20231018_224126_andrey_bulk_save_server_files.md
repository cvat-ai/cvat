### Fixed

- Race condition in a task data upload request, which may lead to problems with task creation in some specific cases,
  such as multiple identical data requests at the same time
  (<https://github.com/opencv/cvat/pull/7025>)
