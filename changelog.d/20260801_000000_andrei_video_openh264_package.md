### Added

- New pre-alpha `cvat-mp4-h264` package that decodes CVAT video chunks
  with a separately supplied OpenH264 library
  (<https://github.com/cvat-ai/cvat/pull/11420>)
- \[SDK\] `TaskDataset`, and with it the PyTorch adapter, auto-annotation and AI agents,
  can read frames of video tasks; this requires the new `video` extra
  and the OpenH264 library
  (<https://github.com/cvat-ai/cvat/pull/11420>)
