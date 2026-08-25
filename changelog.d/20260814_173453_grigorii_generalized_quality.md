### Added

- \[Server API\] Added configurable, hierarchical quality requirements for tasks
  and projects. Requirements can select annotation subsets with filters, inherit
  comparison settings, and define metric thresholds and attribute comparison
  rules. Quality reports now include per-requirement results and downloadable
  confusion matrices.
  (<https://github.com/cvat-ai/cvat/pull/10436>)

### Changed

- \[Server API\] Quality comparison parameters now belong to individual
  requirements instead of the quality settings object, and quality report
  summaries and data use the new requirement-based format.
  (<https://github.com/cvat-ai/cvat/pull/10436>)
