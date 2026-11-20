### Fixed

- SDK `Task.remove_annotations` and `Job.remove_annotations` no longer delete all annotations when given an empty ID sequence. Omitted IDs and `None` retain the full-delete operation
  (<https://github.com/cvat-ai/cvat/issues/11486>)
