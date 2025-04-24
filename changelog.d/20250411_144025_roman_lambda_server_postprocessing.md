### Fixed

- Numeric attribute values returned by Nuclio functions are now checked
  for being in the acceptable range when running whole-task auto-annotation
  (<https://github.com/cvat-ai/cvat/pull/9285>)

- With per-frame auto-annotation, numeric attribute range validation now
  works correctly when the minimum value is not a multiple of the step
  (<https://github.com/cvat-ai/cvat/pull/9285>)
