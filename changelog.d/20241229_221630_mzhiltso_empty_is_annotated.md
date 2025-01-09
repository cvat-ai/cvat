### Changed

- The `match_empty_frames` quality setting is changed to `empty_is_annotated`.
  The updated option includes any empty frames in the final metrics instead of only
  matching empty frames. This makes metrics such as Precision much more representative and useful.
  (<https://github.com/cvat-ai/cvat/pull/8888>)
