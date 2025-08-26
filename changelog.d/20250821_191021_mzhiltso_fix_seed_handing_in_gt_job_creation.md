### Removed

- Removed deprecated `seed` parameter in job creation in favor of `random_seed`
  (<https://github.com/cvat-ai/cvat/pull/9744>)

### Fixed

- Server error in GT job creation if the `random_per_job` frame selection method
  was used with the `seed` parameter.
  (<https://github.com/cvat-ai/cvat/pull/9744>)
