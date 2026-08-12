### Fixed

- Task creation from a cloud storage video with a manifest failed with
  `InvalidManifestError` when a directory was selected or `filename_pattern`
  was used, because the video manifest was parsed as an image manifest
  (<https://github.com/cvat-ai/cvat/pull/10916>)
