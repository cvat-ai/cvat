### Changed

- When importing track annotations from a dataset,
  the last visible shape of every interval will now include
  2 keyframes - the last visible shape and the outside shape.
  If the annotations were originally created in CVAT, the "keyframe" property
  can be slightly different from the original annotations after importing.
  (<https://github.com/cvat-ai/cvat/pull/10409>)

### Fixed

- Imported tracks can be interpolated incorrectly
  (<https://github.com/cvat-ai/cvat/pull/10409>)
