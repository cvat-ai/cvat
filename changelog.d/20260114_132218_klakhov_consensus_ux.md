### Changed

- Consensus merge function now preserves all shapes with their scores, regardless of quorum threshold
  (<https://github.com/cvat-ai/cvat/pull/10172>)

### Added

- Score visualization in UI with a virtual "Votes" attribute calculated as `score × replica_jobs`
  (<https://github.com/cvat-ai/cvat/pull/10172>)
- A user now may navigate between different shapes with shortcuts (Tab/Shift+Tab by default) in Standard, Review modes
  (<https://github.com/cvat-ai/cvat/pull/10172>)
- Review mode now supports editing objects. Users can unlock and edit individual annotations as needed
  (<https://github.com/cvat-ai/cvat/pull/10172>)
- Double-clicking an object in the sidebar now centers it on the canvas and expands its details
  (<https://github.com/cvat-ai/cvat/pull/10172>)

### Removed
- Consensus quorum setting has been removed. All merged annotations are now kept with their consensus scores,
  allowing users to filter results based on score thresholds instead
  (<https://github.com/cvat-ai/cvat/pull/10172>)
