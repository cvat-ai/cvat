### Changed

- Consensus merge function now preserves all shapes with their scores, regardless of quorum threshold
  (<https://github.com/cvat-ai/cvat/pull/10172>)
- In review mode, all annotations are locked by default; Users can unlock and edit individual annotations as needed
  (<https://github.com/cvat-ai/cvat/pull/10172>)
- Next/Previous object navigation (`Shift+Tab`/`Shift` shortcuts by default)
now works in Standard, Review and Attribute Annotation workspaces
  (<https://github.com/cvat-ai/cvat/pull/10172>)

### Added

- Score visualization in UI with a virtual "Votes" attribute calculated as `score × replica_jobs`
  (<https://github.com/cvat-ai/cvat/pull/10172>)
- Double-clicking an object in the sidebar now centers it on the canvas and expands its details
  (<https://github.com/cvat-ai/cvat/pull/10172>)

### Removed
- Consensus `quorum` setting
  (<https://github.com/cvat-ai/cvat/pull/10172>)