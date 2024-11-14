### Added

- \[SDK, CLI\] Added a `conf_threshold` parameter to
  `cvat_sdk.auto_annotation.annotate_task`, which is passed as-is to the AA
  function object via the context. The CLI equivalent is `auto-annotate
  --conf-threshold`. This makes it easier to write and use AA functions that
  support object filtering based on confidence levels
  (<https://github.com/cvat-ai/cvat/pull/8688>)

- \[SDK\] Built-in auto-annotation functions now support object filtering by
  confidence level
  (<https://github.com/cvat-ai/cvat/pull/8688>)
